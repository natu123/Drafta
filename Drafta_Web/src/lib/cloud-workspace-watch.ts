import { collection, limit, onSnapshot, onSnapshotsInSync, query, Timestamp, where, type CollectionReference, type DocumentSnapshot, type Firestore, type QuerySnapshot } from 'firebase/firestore';
import { BACKUP_LIMITS, type BackupNote } from './workspace-backup';
import { assemble, envelopeOf, LegacyWorkspaceError, metadataOf, readBodyRecord, readHead, readSummaryRecord, WorkspaceStorageError, workspaceRoot, type Body, type SavedWorkspace } from './cloud-workspace';
import { noteMetadata, type NoteSummary } from './note-summary';

/**
 * One initial query per collection, then changed documents only; never publish pending/cache-only
 * snapshots. With a loaded base at the server's current revision, only summaries and bodies saved
 * since that revision are queried (specs/15, specs/17). `known` returns true for a revision this
 * client already holds (its own save); that revision is not assembled again, since revisions only
 * advance through one transaction each.
 */
export function watchCloudWorkspace(db: Firestore, uid: string, next: (workspace: SavedWorkspace) => void, failed: (error: unknown) => void,
  known: (revision: number) => boolean = () => false, base: SavedWorkspace | null = null): () => void {
  const root = workspaceRoot(db, uid);
  const summaryCollection = collection(root, 'notes');
  const bodyCollection = collection(root, 'bodies');
  let metadata: DocumentSnapshot | null = null;
  let summaries: QuerySnapshot | null = null;
  let bodies: QuerySnapshot | null = null;
  let offSummaries: (() => void) | null = null;
  let offBodies: (() => void) | null = null;
  // Memos known from the base; only used when the queries are limited to recent saves.
  let baseNotes: Map<string, BackupNote> | null = null;
  let revision = base?.uid === uid ? base.revision : 0;
  let active = true;
  // A document's parsed value is reused while its stored text is unchanged.
  const parsed = new Map<string, { text: string; summary?: NoteSummary; body?: Body; bytes: number }>();
  const reuse = <T extends 'summary' | 'body'>(kind: T, id: string, text: unknown, read: () => { bytes: number } & Record<T, T extends 'summary' ? NoteSummary : Body>) => {
    const key = `${kind}:${id}`;
    const cached = parsed.get(key);
    if (cached && cached.text === text && cached[kind] !== undefined) return { value: cached[kind]!, bytes: cached.bytes };
    const value = read();
    parsed.set(key, { text: String(text), [kind]: value[kind], bytes: value.bytes });
    return { value: value[kind], bytes: value.bytes };
  };
  const error = (value: unknown) => { if (active) failed(value); };
  const listen = (since: Timestamp | null) => {
    const target = (source: CollectionReference) => since ? query(source, where('updatedAt', '>=', since), limit(BACKUP_LIMITS.notes)) : query(source, limit(BACKUP_LIMITS.notes));
    offSummaries = onSnapshot(target(summaryCollection), { includeMetadataChanges: true }, snapshot => { summaries = snapshot; }, error);
    offBodies = onSnapshot(target(bodyCollection), { includeMetadataChanges: true }, snapshot => { bodies = snapshot; }, error);
  };
  const offRoot = onSnapshot(root, { includeMetadataChanges: true }, snapshot => {
    metadata = snapshot;
    if (offSummaries || snapshot.metadata.fromCache) return;
    const data = snapshot.exists() ? snapshot.data() : null;
    // Same revision and timestamp as the loaded base: every later save carries a newer updatedAt.
    if (base?.uid === uid && data?.revision === base.revision && data.updatedAt instanceof Timestamp) {
      baseNotes = new Map(base.backup.notes.map(note => [note.id, note]));
      listen(data.updatedAt);
    } else listen(null);
  }, error);
  const offSync = onSnapshotsInSync(db, () => {
    if (!active || !metadata || !summaries || !bodies) return;
    if ([metadata, summaries, bodies].some(snapshot => snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites)) return;
    if (!metadata.exists()) return; // A first-time account may not have saved yet.
    const data = metadata.data();
    if (data.revision === revision) return;
    try {
      const head = readHead(data);
      if (head.version !== 2) throw new LegacyWorkspaceError();
      // The recent-saves queries are cumulative from the base, so skipping a revision loses nothing.
      if (known(head.revision)) { revision = head.revision; return; }
      let textBytes = new TextEncoder().encode(head.text).byteLength;
      const summaryMap = new Map(summaries.docs.map(record => {
        const read = reuse('summary', record.id, record.data().summaryJson, () => readSummaryRecord(record.id, record.data()));
        textBytes += read.bytes;
        return [record.id, read.value] as const;
      }));
      const bodyMap = new Map(bodies.docs.map(record => {
        const read = reuse('body', record.id, record.data().documentJson, () => readBodyRecord(record.id, record.data()));
        textBytes += read.bytes;
        return [record.id, read.value] as const;
      }));
      const order = head.metadata.noteOrder;
      if (!baseNotes && (order.length !== summaryMap.size || order.length !== bodyMap.size)) throw new WorkspaceStorageError('Incomplete workspace snapshot');
      // Deleted memos leave the order; anything else missing means the snapshot is incomplete.
      const backup = assemble(envelopeOf(head), order, id => {
        const summary = summaryMap.get(id), body = bodyMap.get(id), held = baseNotes?.get(id);
        if (!summary && !body) return held;
        const fields = summary ? noteMetadata(summary) : held && metadataOf(held);
        const document = body ?? held?.document;
        return fields && document ? { ...fields, document } : undefined;
      }, [...summaryMap.values()].filter(summary => order.includes(summary.id)), textBytes);
      revision = head.revision;
      next({ uid, revision, backup });
    } catch (value) { error(value); }
  });
  return () => { active = false; offRoot(); offSummaries?.(); offBodies?.(); offSync(); };
}
