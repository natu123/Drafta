import type { Group, Note } from './types';

/**
 * The "All memos" view (AGENTS.md, All Memos). It is not a stored tray: stored IDs never contain
 * ':' (workspace-backup), so it cannot clash with one.
 */
export const ALL_MEMOS = ':all';

/**
 * The tray memos added in the all memos view go to: the one chosen there last time on this device
 * while it is live, otherwise the first live tray in the stored order, the one the app opens by
 * default (Inbox in a new workspace). The view shows it in its add field and lets it be changed.
 */
export function trayForNewMemos(groups: Group[], chosenId?: string | null): Group | undefined {
  const live = (group: Group) => !group.isDeleted && group.type !== 'separator';
  return (chosenId ? groups.find(group => group.id === chosenId && live(group)) : undefined) ?? groups.find(live);
}

/** Every memo in a live tray, by last edit; the newest sits where the list opens (top, or bottom in the chat style). */
export function allMemos(notes: Note[], groups: Group[], listStyle: 'top' | 'bottom'): Note[] {
  const trays = new Set(groups.filter(group => !group.isDeleted && group.type !== 'separator').map(group => group.id));
  const time = (note: Note) => Date.parse(note.updatedAt) || 0;
  const newestFirst = notes
    .filter(note => !note.isDeleted && note.type !== 'separator' && trays.has(note.group))
    .map((note, index) => ({ note, index }))
    .sort((a, b) => time(b.note) - time(a.note) || a.index - b.index)
    .map(item => item.note);
  return listStyle === 'bottom' ? newestFirst.reverse() : newestFirst;
}
