import type { Note } from './types';

export const pinnedNotes = (items: Note[]) => items.filter(item => item.type !== 'separator' && item.isPinned);
export const regularNotes = (items: Note[]) => items.filter(item => item.type === 'separator' || !item.isPinned);

// Preserve the other section's order and the original slots when dragging.
export function reorderPinSection<T extends { id: string; isPinned?: boolean }>(items: T[], active: string, over: string): T[] {
  const source = items.find(item => item.id === active);
  const target = items.find(item => item.id === over);
  if (!source || !target || Boolean(source.isPinned) !== Boolean(target.isPinned)) return items;
  const section = items.filter(item => Boolean(item.isPinned) === Boolean(source.isPinned));
  const from = section.findIndex(item => item.id === active);
  const to = section.findIndex(item => item.id === over);
  const [moved] = section.splice(from, 1);
  section.splice(to, 0, moved);
  let index = 0;
  return items.map(item => Boolean(item.isPinned) === Boolean(source.isPinned) ? section[index++] : item);
}
