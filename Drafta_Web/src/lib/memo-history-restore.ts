import { validateHistoryNote, type MemoHistoryVersion } from './memo-history';
import { createWorkspaceBackup, type BackupNote } from './workspace-backup';
import { workspaceToState } from './workspace-state';
import { localizeSampleNote } from './sample-notes';
import type { Lang } from '@/app/languages';
import type { Group, Note } from './types';

export function historyNoteToState(version: MemoHistoryVersion, dom: Document): Note {
  const note = validateHistoryNote(version.note);
  const { parentId, ...unlinked } = note;
  const state = workspaceToState({ format: 'drafta-workspace', version: 1, exportedAt: version.capturedAt,
    groups: [{ id: note.group, name: '', type: 'group' }], notes: [unlinked],
    settings: { language: null, theme: 'system', listStyle: 'top', noteSort: 'manual' },
  }, dom);
  return { ...state.notes[0], ...(parentId ? { parentId } : {}) };
}
export function freezeHistorySample(note: BackupNote, dom: Document, lang: Lang, modKey: 'Cmd' | 'Ctrl'): BackupNote {
  if (!note.sampleKey) return note;
  const source = localizeSampleNote(historyNoteToState({ id: 'snapshot', capturedAt: note.updatedAt, note }, dom), lang, modKey);
  const { parentId, ...unlinked } = source;
  const frozen = createWorkspaceBackup({ groups: [{ id: note.group, name: '', type: 'group' }], notes: [{ ...unlinked, sampleKey: undefined }],
    settings: { language: lang, theme: 'system', listStyle: 'top', noteSort: 'manual' },
  }, dom).notes[0];
  return { ...frozen, ...(parentId ? { parentId } : {}) };
}
export function restoreHistoryCopy(version: MemoHistoryVersion, groups: Group[], notes: Note[], options: {
  dom: Document; preferredGroupId: string; newId: () => string;
  now: string; suffix: string; unnamed: string; recoveredTrayName: string;
}): { note: Note; newGroup: Group | null } {
  const source = historyNoteToState(version, options.dom);
  const existingGroup = groups.find(group => group.id === options.preferredGroupId && !group.isDeleted && group.type !== 'separator')
    ?? groups.find(group => !group.isDeleted && group.type !== 'separator');
  const newGroup: Group | null = existingGroup ? null : { id: options.newId(), name: options.recoveredTrayName, type: 'group' };
  const groupId = (existingGroup ?? newGroup)!.id;
  const id = options.newId();
  if (notes.some(note => note.id === id) || groups.some(group => group.id === id || group.id === newGroup?.id) || id === newGroup?.id) throw new Error('Duplicate restored identity');
  const parentId = notes.some(note => note.id === source.parentId && !note.isDeleted && note.type !== 'separator' && note.group === groupId) ? source.parentId : undefined;
  return { newGroup, note: { ...source, id, group: groupId, title: `${source.title || options.unnamed} (${options.suffix})`,
    parentId, sampleKey: undefined, isDeleted: false, isProtected: false, isPinned: false, isCompleted: false,
    createdAt: options.now, updatedAt: options.now, lastAccessedAt: undefined,
  } };
}
