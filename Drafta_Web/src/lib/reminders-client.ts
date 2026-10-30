import { collection, deleteDoc, doc, onSnapshot, query, serverTimestamp, setDoc, Timestamp, where, type Firestore } from 'firebase/firestore';
import type { Lang } from '@/app/languages';
import { summarizeNote } from './note-summary';
import { nextRing, type Repeat } from './reminder-time';
import type { BackupNote } from './workspace-backup';

/**
 * A memo's reminder in the app (specs/25_reminders.md, 2.3): the owner's reminders are watched, a
 * reminder is set from the bell's popover, and saves keep its title and stop it when the memo is
 * completed or moved to the trash. The server sends it (functions/src/reminders.ts).
 */
export type ReminderView = { wallTime: string; timeZone: string; repeat: Repeat; nextAt: number | null };
export const REMINDER_TITLE_LENGTH = 2000;

export class PastReminderError extends Error {
  constructor() { super('The chosen time has passed'); this.name = 'PastReminderError'; }
}

const idOf = (uid: string, noteId: string) => `${uid}_${noteId}`;
const titleOf = (note: BackupNote) => Array.from(summarizeNote(note).title).slice(0, REMINDER_TITLE_LENGTH).join('');

export function reminders(db: Firestore, uid: string, options: { prepare?: (note: BackupNote) => BackupNote; lang: () => Lang }) {
  const known = new Map<string, ReminderView & { title: string; lang: string }>();
  const ref = (noteId: string) => doc(db, 'reminders', idOf(uid, noteId));
  const write = (noteId: string, title: string, view: ReminderView, lang: string) => setDoc(ref(noteId), {
    ownerUid: uid, noteId, title, wallTime: view.wallTime, timeZone: view.timeZone, repeat: view.repeat,
    nextAt: view.nextAt === null ? null : Timestamp.fromMillis(view.nextAt), lang, updatedAt: serverTimestamp(),
  });
  const titleFor = (note: BackupNote) => titleOf({ ...(options.prepare?.(note) ?? note), id: note.id });

  return {
    /** Hears every change of this account's reminders (noteId to reminder). */
    watch(onChange: (all: ReadonlyMap<string, ReminderView>) => void): () => void {
      return onSnapshot(query(collection(db, 'reminders'), where('ownerUid', '==', uid)), snapshot => {
        known.clear();
        for (const entry of snapshot.docs) {
          const data = entry.data();
          if (typeof data.noteId !== 'string' || typeof data.wallTime !== 'string' || typeof data.timeZone !== 'string') continue;
          known.set(data.noteId, {
            wallTime: data.wallTime, timeZone: data.timeZone, repeat: data.repeat as Repeat, title: String(data.title ?? ''), lang: String(data.lang ?? 'en'),
            nextAt: data.nextAt instanceof Timestamp ? data.nextAt.toMillis() : null,
          });
        }
        onChange(new Map([...known].map(([id, { wallTime, timeZone, repeat, nextAt }]) => [id, { wallTime, timeZone, repeat, nextAt }])));
      }, () => onChange(new Map()));
    },
    /** Sets a memo's reminder at a local date and time in this device's time zone. Only Pro succeeds. */
    async set(note: BackupNote, wallTime: string, repeat: Repeat, now = Date.now()): Promise<void> {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const nextAt = nextRing(wallTime, timeZone, repeat, now);
      if (nextAt === null) throw new PastReminderError();
      await write(note.id, titleFor(note), { wallTime, timeZone, repeat, nextAt }, options.lang());
    },
    remove: (noteId: string) => deleteDoc(ref(noteId)),
    /**
     * After a save: a reminder keeps its memo's title, stops when the memo is completed, and goes
     * when the memo is moved to the trash or deleted. Never fails or delays the save.
     */
    async follow(changed: readonly BackupNote[], deleted: readonly string[]): Promise<void> {
      const jobs: Promise<unknown>[] = [];
      for (const note of changed) {
        const current = known.get(note.id);
        if (!current) continue;
        if (note.isDeleted) { jobs.push(deleteDoc(ref(note.id))); continue; }
        const title = titleFor(note);
        const nextAt = note.isCompleted ? null : current.nextAt;
        if (title !== current.title || nextAt !== current.nextAt) jobs.push(write(note.id, title, { ...current, nextAt }, current.lang));
      }
      for (const id of deleted) if (known.has(id)) jobs.push(deleteDoc(ref(id)));
      const failed = (await Promise.allSettled(jobs)).find(result => result.status === 'rejected');
      if (failed) throw (failed as PromiseRejectedResult).reason;
    },
  };
}
export type Reminders = ReturnType<typeof reminders>;
