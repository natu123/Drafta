import { collection, doc, getDocFromServer, getDocsFromServer, limit, query, runTransaction, serverTimestamp, startAfter, Timestamp, where, type DocumentData, type Firestore, type QueryDocumentSnapshot, type QuerySnapshot } from 'firebase/firestore';
import { BACKUP_LIMITS, isValidatedBackup, parseStoredDocument, parseWorkspaceBackup, serializeWorkspaceBackup, trustAssembledBackup, type BackupNote, type WorkspaceBackup } from './workspace-backup';
import { noteMetadata, parseSummary, summaryMatches, summaryText, validateSummaries, type NoteMetadata, type NoteSummary, type WorkspaceEnvelope } from './note-summary';
import { memoHistory, historyCandidate } from './memo-history';
import { CLOUD_LIMITS } from './cloud-limits';

export { CLOUD_LIMITS };

export class WorkspaceConflictError extends Error {
  constructor() { super('The server workspace changed. Reload before saving.'); this.name = 'WorkspaceConflictError'; }
}
export class WorkspaceStorageError extends Error {
  constructor(message: string) { super(message); this.name = 'WorkspaceStorageError'; }
}
/** The server workspace still uses the 0.7 storage (schemaVersion 1) and must be migrated first (specs/17). */
export class LegacyWorkspaceError extends Error {
  constructor() { super('The workspace uses the previous storage format.'); this.name = 'LegacyWorkspaceError'; }
}
export type SavedWorkspace = { uid: string; revision: number; backup: WorkspaceBackup };
/** A confirmed workspace and a lower bound of the server time of its revision (specs/16). */
export type WorkspaceSince = { seconds: number; nanoseconds: number };
export type LoadedWorkspace = { saved: SavedWorkspace; since: WorkspaceSince | null };
/** Every memo without its body, for the list before the bodies arrive (specs/17). */
export type PartialWorkspace = { uid: string; revision: number; since: WorkspaceSince | null; envelope: WorkspaceEnvelope; summaries: NoteSummary[] };
export type Body = BackupNote['document'];
/** A whole workspace from summaries; `changed` lists the memos another device saved or deleted meanwhile ('all' when unknown). */
export type HydratedWorkspace = LoadedWorkspace & { changed: ReadonlySet<string> | 'all' };

/** Bodies read per query while bringing a new device up to date. */
export const BODY_PAGE = 100;
const encoder = new TextEncoder();
const bytes = (text: string) => encoder.encode(text).byteLength;

function checkSize(text: string): string {
  // UTF-8 takes at most 3 bytes per UTF-16 unit: most text needs no encoding to be within the limit.
  if (text.length * 3 > CLOUD_LIMITS.documentBytes && bytes(text) > CLOUD_LIMITS.documentBytes) throw new WorkspaceStorageError('Document is too large to save');
  return text;
}
function checkedBackup(input: WorkspaceBackup): WorkspaceBackup {
  // A frozen snapshot was validated when it was made and cannot have changed since.
  return isValidatedBackup(input) ? input : parseWorkspaceBackup(serializeWorkspaceBackup(input));
}

export function workspaceRoot(db: Firestore, uid: string) {
  if (!uid || uid.length > 128 || uid.includes('/')) throw new WorkspaceStorageError('Invalid account');
  return doc(db, 'users', uid, 'workspaces', 'default');
}

export type Head = { version: 1 | 2; revision: number; text: string; metadata: { noteOrder: string[] } & Record<string, unknown>; since: WorkspaceSince | null };
/** The workspace document: storage version, revision, metadata and the server time of that revision. */
export function readHead(data: DocumentData | undefined): Head {
  if (!data || (data.schemaVersion !== 1 && data.schemaVersion !== 2) || !Number.isSafeInteger(data.revision) || Number(data.revision) < 1) throw new WorkspaceStorageError('Invalid server workspace');
  const text = data.metadataJson;
  if (typeof text !== 'string') throw new WorkspaceStorageError('Missing workspace metadata');
  checkSize(text);
  const metadata = JSON.parse(text);
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata) ||
      Object.keys(metadata).some(key => !['format', 'version', 'exportedAt', 'groups', 'settings', 'noteOrder'].includes(key)) ||
      !Array.isArray(metadata.noteOrder) || metadata.noteOrder.length > BACKUP_LIMITS.notes ||
      metadata.noteOrder.some((id: unknown) => typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(id)) ||
      new Set(metadata.noteOrder).size !== metadata.noteOrder.length) throw new WorkspaceStorageError('Invalid note order');
  const since = data.updatedAt instanceof Timestamp ? { seconds: data.updatedAt.seconds, nanoseconds: data.updatedAt.nanoseconds } : null;
  return { version: data.schemaVersion, revision: Number(data.revision), text, metadata, since };
}
export const envelopeOf = (head: Head): WorkspaceEnvelope => {
  const { noteOrder: _order, ...envelope } = head.metadata;
  void _order;
  return envelope as WorkspaceEnvelope;
};
const currentHead = (data: DocumentData | undefined) => {
  const head = readHead(data);
  if (head.version !== 2) throw new LegacyWorkspaceError();
  return head;
};

/** A summary document: schemaVersion 2, or schemaVersion 1 that the migration gave a summary. */
export function readSummaryRecord(id: string, data: DocumentData): { summary: NoteSummary; bytes: number } {
  if ((data.schemaVersion !== 2 && data.schemaVersion !== 1) || typeof data.summaryJson !== 'string') throw new WorkspaceStorageError('Invalid server memo');
  checkSize(data.summaryJson);
  return { summary: parseSummary(data.summaryJson, id), bytes: bytes(data.summaryJson) };
}
export function readBodyRecord(id: string, data: DocumentData): { body: Body; bytes: number } {
  if (data.schemaVersion !== 2 || typeof data.documentJson !== 'string') throw new WorkspaceStorageError('Invalid server memo body');
  checkSize(data.documentJson);
  const size = bytes(data.documentJson);
  return { body: parseStoredDocument(data.documentJson, `notes.${id}.document`, size), bytes: size };
}

// Stored bodies are frozen and reused while unchanged, so each is serialized once.
const bodyTexts = new WeakMap<object, string>();
export function bodyText(note: BackupNote): string {
  let text = bodyTexts.get(note.document);
  if (text === undefined) {
    text = JSON.stringify(note.document);
    if (Object.isFrozen(note.document)) bodyTexts.set(note.document, text);
  }
  return text;
}
export const metadataOf = (note: BackupNote): NoteMetadata => {
  const { document: _body, ...metadata } = note;
  void _body;
  return metadata;
};

/**
 * The memos in the head's order, checked like any loaded workspace. Every summary read from the
 * server must agree with its body (same title and excerpt as made from it), or nothing is used.
 */
export function assemble(envelope: WorkspaceEnvelope, order: string[], noteFor: (id: string) => BackupNote | undefined, summaries: Iterable<NoteSummary>, textBytes: number): WorkspaceBackup {
  const notes = order.map(id => {
    const note = noteFor(id);
    if (!note) throw new WorkspaceStorageError('Missing memo');
    return note;
  });
  const backup = trustAssembledBackup({ ...JSON.parse(JSON.stringify(envelope)), notes }, textBytes);
  const byId = new Map(backup.notes.map(note => [note.id, note]));
  for (const summary of summaries) {
    const note = byId.get(summary.id);
    if (note && !summaryMatches(summary, note)) throw new WorkspaceStorageError('Memo summary does not match its body');
  }
  return backup;
}

/** Cloud-only repository. All reads come from the server, never offline cache. */
export function cloudWorkspace(db: Firestore, uid: string, options: { onHistoryFailure?: () => void; historySnapshot?: (note: BackupNote) => BackupNote } = {}) {
  const root = workspaceRoot(db, uid);
  const summariesCollection = collection(root, 'notes');
  const bodiesCollection = collection(root, 'bodies');
  const history = memoHistory(db, uid);

  /** Head and summaries at one revision; null without a workspace. Throws LegacyWorkspaceError for 0.7 storage. */
  async function loadSummaries(): Promise<PartialWorkspace | null> {
    // Read the revision twice so a concurrent atomic save cannot mix two states.
    for (let attempt = 0; attempt < 3; attempt++) {
      const start = await getDocFromServer(root);
      if (!start.exists()) return null;
      const head = currentHead(start.data());
      const records = await getDocsFromServer(query(summariesCollection, limit(BACKUP_LIMITS.notes)));
      // Production caps a query at 10,000. Probe overflow in a separate page.
      const overflow = records.size === BACKUP_LIMITS.notes
        ? await getDocsFromServer(query(summariesCollection, startAfter(records.docs[records.size - 1]), limit(1))) : null;
      const finish = await getDocFromServer(root);
      if (!finish.exists() || readHead(finish.data()).revision !== head.revision) continue;
      if (overflow && !overflow.empty) throw new WorkspaceStorageError('Workspace has too many memos');
      if (records.size !== head.metadata.noteOrder.length) throw new WorkspaceStorageError('Incomplete server workspace');
      const found = new Map(records.docs.map(record => [record.id, readSummaryRecord(record.id, record.data()).summary]));
      const summaries = head.metadata.noteOrder.map(id => {
        const summary = found.get(id);
        if (!summary) throw new WorkspaceStorageError('Incomplete server workspace');
        return summary;
      });
      const envelope = envelopeOf(head);
      validateSummaries(envelope, summaries);
      return { uid, revision: head.revision, since: head.since, envelope, summaries };
    }
    throw new WorkspaceConflictError();
  }

  /** One body, read first for the memo being opened while the others arrive. */
  async function loadBody(id: string): Promise<Body | null> {
    const record = await getDocFromServer(doc(bodiesCollection, id));
    return record.exists() ? readBodyRecord(id, record.data()).body : null;
  }

  /**
   * Summaries and bodies saved at or after `since`, at one revision. `unchanged` when the server is
   * still at `known`; null when the change set is too large to read this way.
   */
  async function changesSince(since: WorkspaceSince, known?: number) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const start = await getDocFromServer(root);
      if (!start.exists()) return { head: null, unchanged: false, summaries: new Map<string, NoteSummary>(), bodies: new Map<string, Body>(), bytes: 0 } as const;
      const head = currentHead(start.data());
      if (head.revision === known) return { head, unchanged: true, summaries: new Map<string, NoteSummary>(), bodies: new Map<string, Body>(), bytes: 0 } as const;
      const after = new Timestamp(since.seconds, since.nanoseconds);
      const [summaries, bodies] = await Promise.all([
        getDocsFromServer(query(summariesCollection, where('updatedAt', '>=', after), limit(BACKUP_LIMITS.notes))),
        getDocsFromServer(query(bodiesCollection, where('updatedAt', '>=', after), limit(BACKUP_LIMITS.notes))),
      ]);
      const finish = await getDocFromServer(root);
      if (!finish.exists() || readHead(finish.data()).revision !== head.revision) continue;
      if (summaries.size === BACKUP_LIMITS.notes || bodies.size === BACKUP_LIMITS.notes) return null;
      let total = bytes(head.text);
      const read = <T,>(records: QueryDocumentSnapshot[], parse: (id: string, data: DocumentData) => { bytes: number } & T) => new Map(records.map(record => {
        const value = parse(record.id, record.data());
        total += value.bytes;
        return [record.id, value] as const;
      }));
      const summaryMap = new Map([...read(summaries.docs, readSummaryRecord)].map(([id, value]) => [id, value.summary]));
      const bodyMap = new Map([...read(bodies.docs, readBodyRecord)].map(([id, value]) => [id, value.body]));
      return { head, unchanged: false, summaries: summaryMap, bodies: bodyMap, bytes: total } as const;
    }
    throw new WorkspaceConflictError();
  }

  /**
   * Reads every body of a summary-only workspace (specs/17), `onBody` for each as it arrives, then
   * checks the revision: when another device saved meanwhile, the saved changes are read again, so
   * the result is one revision. `known` holds bodies already read for the memo being opened.
   */
  async function hydrate(partial: PartialWorkspace, hooks: { onBody?: (id: string, body: Body) => void; known?: ReadonlyMap<string, Body> } = {}): Promise<HydratedWorkspace | null> {
    if (partial.uid !== uid) throw new WorkspaceStorageError('Account changed');
    const wanted = new Set(partial.summaries.map(summary => summary.id));
    const bodies = new Map<string, Body>();
    let textBytes = 0;
    for (const [id, body] of hooks.known ?? []) if (wanted.has(id)) bodies.set(id, body);
    let cursor: QueryDocumentSnapshot | null = null;
    for (;;) {
      const page: QuerySnapshot = await getDocsFromServer(cursor ? query(bodiesCollection, startAfter(cursor), limit(BODY_PAGE)) : query(bodiesCollection, limit(BODY_PAGE)));
      for (const record of page.docs) {
        if (!wanted.has(record.id)) continue;
        const { body, bytes: size } = readBodyRecord(record.id, record.data());
        textBytes += size;
        bodies.set(record.id, body);
        hooks.onBody?.(record.id, body);
      }
      if (page.size < BODY_PAGE) break;
      cursor = page.docs[page.size - 1];
    }
    const finish = await getDocFromServer(root);
    if (!finish.exists()) return null;
    const head = currentHead(finish.data());
    const summaries = new Map(partial.summaries.map(summary => [summary.id, summary]));
    let envelope = partial.envelope, order = partial.summaries.map(summary => summary.id), revision = partial.revision, since = partial.since;
    const changed = new Set<string>();
    const reload = async () => { const loaded = await loadWithSince(); return loaded && { ...loaded, changed: 'all' as const }; };
    if (head.revision !== partial.revision) {
      if (!partial.since) return reload();
      const changes = await changesSince(partial.since);
      if (!changes?.head) return changes ? null : reload();
      for (const id of [...changes.summaries.keys(), ...changes.bodies.keys()]) changed.add(id);
      for (const id of order) if (!changes.head.metadata.noteOrder.includes(id)) changed.add(id);
      for (const [id, summary] of changes.summaries) summaries.set(id, summary);
      for (const [id, body] of changes.bodies) { bodies.set(id, body); hooks.onBody?.(id, body); }
      textBytes += changes.bytes;
      envelope = envelopeOf(changes.head); order = changes.head.metadata.noteOrder; revision = changes.head.revision; since = changes.head.since;
      validateSummaries(envelope, order.map(id => {
        const summary = summaries.get(id);
        if (!summary) throw new WorkspaceStorageError('Missing memo');
        return summary;
      }));
    }
    const backup = assemble(envelope, order, id => {
      const summary = summaries.get(id), body = bodies.get(id);
      return summary && body ? { ...noteMetadata(summary), document: body } : undefined;
    }, order.map(id => summaries.get(id)!), textBytes);
    return { saved: { uid, revision, backup }, since, changed };
  }

  async function loadWithSince(): Promise<LoadedWorkspace | null> {
    const partial = await loadSummaries();
    return partial ? hydrate(partial) : null;
  }

  async function load(): Promise<SavedWorkspace | null> {
    return (await loadWithSince())?.saved ?? null;
  }

  /**
   * Starts from a workspace this device already holds (specs/16): one read when the server has
   * the same revision, otherwise only the summaries and bodies saved since `since`. Every memo saved
   * after a revision carries a later server time, so an older `since` only reads more. Anything
   * that does not add up falls back to the full load.
   */
  async function loadSince(cached: LoadedWorkspace): Promise<LoadedWorkspace | null> {
    if (cached.saved.uid !== uid || !cached.since) return loadWithSince();
    const changes = await changesSince(cached.since, cached.saved.revision);
    if (!changes) return loadWithSince();
    if (!changes.head) return null;
    if (changes.unchanged) return { saved: cached.saved, since: changes.head.since ?? cached.since };
    if (changes.head.revision < cached.saved.revision || !changes.head.since) return loadWithSince();
    const held = new Map(cached.saved.backup.notes.map(note => [note.id, note]));
    const order = changes.head.metadata.noteOrder;
    const noteFor = (id: string): BackupNote | undefined => {
      const summary = changes.summaries.get(id), body = changes.bodies.get(id), cachedNote = held.get(id);
      if (!summary && !body) return cachedNote;
      const metadata = summary ? noteMetadata(summary) : cachedNote && metadataOf(cachedNote);
      const document = body ?? cachedNote?.document;
      return metadata && document ? { ...metadata, document } : undefined;
    };
    if (order.some(id => !noteFor(id))) return loadWithSince();
    // The memos kept from the device were within the limit when it read them; count what was read now.
    const backup = assemble(envelopeOf(changes.head), order, noteFor, changes.summaries.values(), changes.bytes);
    return { saved: { uid, revision: changes.head.revision, backup }, since: changes.head.since };
  }

  async function save(input: WorkspaceBackup, base: SavedWorkspace | null): Promise<SavedWorkspace> {
    if (base && base.uid !== uid) throw new WorkspaceStorageError('Account changed');
    const backup = checkedBackup(input);
    const { notes, ...envelope } = backup;
    const metadataJson = checkSize(JSON.stringify({ ...envelope, noteOrder: notes.map(note => note.id) }));
    const previous = new Map((base?.backup.notes ?? []).map(note => [note.id, note]));
    const summaries: [string, string][] = [];
    const bodies: [string, string][] = [];
    for (const note of notes) {
      const prior = previous.get(note.id);
      const summary = checkSize(summaryText(note));
      if (!prior || summaryText(prior) !== summary) summaries.push([note.id, summary]);
      // Unchanged memos keep the frozen body they were loaded with.
      if (!prior || (prior.document !== note.document && bodyText(prior) !== bodyText(note))) bodies.push([note.id, checkSize(bodyText(note))]);
    }
    const current = new Set(notes.map(note => note.id));
    const deletes = [...previous.keys()].filter(id => !current.has(id));
    if (summaries.length + bodies.length + deletes.length * 2 > CLOUD_LIMITS.documentWrites ||
        [...summaries, ...bodies].reduce((size, [, text]) => size + bytes(text), bytes(metadataJson)) > CLOUD_LIMITS.transactionBytes) {
      throw new WorkspaceStorageError('Too many changes in one save');
    }
    const revision = (base?.revision ?? 0) + 1;
    await runTransaction(db, async transaction => {
      const server = await transaction.get(root);
      const actual = server.exists() ? currentHead(server.data()).revision : 0;
      if (actual !== (base?.revision ?? 0)) throw new WorkspaceConflictError();
      transaction.set(root, { schemaVersion: 2, revision, metadataJson, updatedAt: serverTimestamp() });
      for (const [id, summaryJson] of summaries) transaction.set(doc(summariesCollection, id), { schemaVersion: 2, summaryJson, updatedAt: serverTimestamp() });
      for (const [id, documentJson] of bodies) transaction.set(doc(bodiesCollection, id), { schemaVersion: 2, documentJson, updatedAt: serverTimestamp() });
      for (const id of deletes) { transaction.delete(doc(summariesCollection, id)); transaction.delete(doc(bodiesCollection, id)); }
    });
    // Archive only after the primary transaction has been acknowledged. Its success
    // must remain acknowledged even if the optional history write fails.
    const changedIds = new Set([...summaries, ...bodies].map(([id]) => id));
    const jobs = [
      ...notes.filter(note => changedIds.has(note.id)).map(note => async () => {
        const candidate = historyCandidate(note, previous.get(note.id));
        if (candidate) await history.record(options.historySnapshot?.(candidate.note) ?? candidate.note, candidate.force);
      }),
      ...deletes.map(id => async () => { await history.remove(id); }),
    ];
    let historyFailed = false;
    // Bound concurrency so restoring a workspace does not flood the service.
    for (let index = 0; index < jobs.length; index += 4) {
      const results = await Promise.allSettled(jobs.slice(index, index + 4).map(job => job()));
      if (results.some(result => result.status === 'rejected')) historyFailed = true;
    }
    if (historyFailed) options.onHistoryFailure?.();
    // Only the successful server transaction advances the acknowledged baseline.
    return { uid, revision, backup };
  }
  return { load, loadWithSince, loadSince, loadSummaries, loadBody, hydrate, save, history };
}
