import { collection, doc, getDoc, getDocsFromServer, serverTimestamp, setDoc, writeBatch, type Firestore } from 'firebase/firestore';
import { bodyText } from './cloud-workspace';
import { parseStoredDocument, type BackupNote } from './workspace-backup';
import { summarizeNote } from './note-summary';
import type { SerializedEditorDocument } from './document-codec';

/**
 * Share links (specs/24_share_links.md): a shared memo has a public copy at `shares/{token}` that
 * follows its edits, and its owner keeps which memos are shared at `shareLinks/{noteId}`. The rules
 * let only a Pro owner write a copy and let anyone read one while its owner is Pro.
 */
export const SHARE_TITLE_LENGTH = 2000;
const TOKEN = /^[A-Za-z0-9_-]{22}$/;

/** 128 random bits as 22 base64url characters. */
export function newShareToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export const isShareToken = (value: string) => TOKEN.test(value);
export const shareUrl = (token: string, origin = window.location.origin) => `${origin}/s/#${token}`;

function copyOf(uid: string, note: BackupNote) {
  return {
    schemaVersion: 1, ownerUid: uid, noteId: note.id,
    title: Array.from(summarizeNote(note).title).slice(0, SHARE_TITLE_LENGTH).join(''),
    documentJson: bodyText(note), updatedAt: serverTimestamp(), blocked: false,
  };
}

/** `onChange` hears every change of which memos are shared (noteId to token), once they are first read. */
export function shareLinks(db: Firestore, uid: string, onChange?: (shared: ReadonlyMap<string, string>) => void) {
  const links = collection(db, 'users', uid, 'workspaces', 'default', 'shareLinks');
  let tokens: Promise<Map<string, string>> | null = null;
  const known = () => tokens ??= getDocsFromServer(links).then(
    snapshot => {
      const map = new Map(snapshot.docs.flatMap(entry => typeof entry.data().token === 'string' && isShareToken(entry.data().token) ? [[entry.id, entry.data().token as string]] : []));
      onChange?.(new Map(map));
      return map;
    },
    error => { tokens = null; throw error; },
  );

  async function stop(noteId: string): Promise<void> {
    const map = await known();
    const token = map.get(noteId);
    if (!token) return;
    const batch = writeBatch(db);
    batch.delete(doc(db, 'shares', token));
    batch.delete(doc(links, noteId));
    await batch.commit();
    map.delete(noteId);
    onChange?.(new Map(map));
  }

  return {
    /** Reads which memos are shared (once per account). */
    load: () => known().then(() => undefined),
    /** The token of a shared memo, or null. */
    async tokenOf(noteId: string): Promise<string | null> { return (await known()).get(noteId) ?? null; },
    /** Shares a memo (or returns its current link). Only a Pro account succeeds. */
    async start(note: BackupNote): Promise<string> {
      const map = await known();
      const current = map.get(note.id);
      if (current) return current;
      const token = newShareToken();
      const batch = writeBatch(db);
      batch.set(doc(db, 'shares', token), copyOf(uid, note));
      batch.set(doc(links, note.id), { token, createdAt: serverTimestamp() });
      await batch.commit();
      map.set(note.id, token);
      onChange?.(new Map(map));
      return token;
    },
    stop,
    /**
     * After a save: the copies of shared memos follow their edits, and moving a memo to the trash or
     * deleting it stops its sharing. Runs after the save, which it never fails or delays.
     */
    async follow(changed: readonly BackupNote[], deleted: readonly string[]): Promise<void> {
      const map = await known();
      const jobs = [
        ...changed.filter(note => map.has(note.id)).map(note => note.isDeleted
          ? () => stop(note.id)
          : () => setDoc(doc(db, 'shares', map.get(note.id)!), copyOf(uid, note))),
        ...deleted.filter(id => map.has(id)).map(id => () => stop(id)),
      ];
      const results = await Promise.allSettled(jobs.map(job => job()));
      const failed = results.find(result => result.status === 'rejected');
      if (failed) throw (failed as PromiseRejectedResult).reason;
    },
  };
}
export type ShareLinks = ReturnType<typeof shareLinks>;

export type SharedMemo = { title: string; document: SerializedEditorDocument };
/** A public copy for the share page, checked like any stored memo; null when it cannot be shown. */
export async function readShare(db: Firestore, token: string): Promise<SharedMemo | null> {
  if (!isShareToken(token)) return null;
  try {
    const snapshot = await getDoc(doc(db, 'shares', token));
    const data = snapshot.data();
    if (!data || typeof data.title !== 'string' || typeof data.documentJson !== 'string') return null;
    return { title: data.title, document: parseStoredDocument(data.documentJson, 'share.document') };
  } catch {
    // Missing, blocked, its owner no longer Pro, or not a valid memo: all look the same.
    return null;
  }
}
