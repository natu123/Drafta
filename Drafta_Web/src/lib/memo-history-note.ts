import { parseWorkspaceBackup, type BackupNote } from './workspace-backup';

// History memos without Firestore, so screens that never sign in (the Playground) do not load it.
export type MemoHistoryVersion = { id: string; capturedAt: string; note: BackupNote };
export const validId = (id: unknown): id is string => typeof id === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(id);

export function validateHistoryNote(value: unknown): BackupNote {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid history memo');
  const raw = value as Record<string, unknown>;
  if (!validId(raw.id) || !validId(raw.group) || (raw.parentId !== undefined && !validId(raw.parentId))) throw new Error('Invalid history identity');
  const { parentId, ...withoutParent } = raw;
  void parentId;
  const backup = parseWorkspaceBackup(JSON.stringify({ format: 'drafta-workspace', version: 1,
    exportedAt: '2026-09-30T00:00:00.000Z', groups: [{ id: raw.group, name: '', type: 'group' }],
    notes: [withoutParent], settings: { language: null, theme: 'system', listStyle: 'top', noteSort: 'manual' },
  }));
  return { ...backup.notes[0], ...(raw.parentId === undefined ? {} : { parentId: raw.parentId as string }) };
}
