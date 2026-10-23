import type { Group, Note } from './types';
import type { ListStyle } from './list-style';

/**
 * The "All memos" view (AGENTS.md, All Memos). It is not a stored tray: stored IDs never contain
 * ':' (workspace-backup), so it cannot clash with one.
 */
export const ALL_MEMOS = ':all';

const live = (group: Group) => !group.isDeleted && group.type !== 'separator';

/**
 * The tray the app opens and adds to by default: the one at the end where the tray list opens.
 * That is the top in the ToDo style (the first pinned tray) and the bottom in the chat style, where
 * the pinned trays come last (the last pinned tray); without pins, the regular tray at that end.
 * Inbox in a new workspace (AGENTS.md, Tray Pins; 0.10.3, before then the first tray in the stored order).
 */
export function defaultTray(groups: Group[], listStyle: ListStyle): Group | undefined {
  const trays = groups.filter(live);
  const pinned = trays.filter(group => group.isPinned), regular = trays.filter(group => !group.isPinned);
  return listStyle === 'bottom' ? pinned[pinned.length - 1] ?? regular[regular.length - 1] : pinned[0] ?? regular[0];
}

/**
 * The tray memos added in the all memos view go to: the one chosen there last time on this device
 * while it is live, otherwise the default tray. The view shows it in its add field and lets it be changed.
 */
export function trayForNewMemos(groups: Group[], listStyle: ListStyle, chosenId?: string | null): Group | undefined {
  return (chosenId ? groups.find(group => group.id === chosenId && live(group)) : undefined) ?? defaultTray(groups, listStyle);
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
