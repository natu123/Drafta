import { describe, expect, it } from 'vitest';
import { localizeUntitledGroup } from './group-display';
import type { Group } from './types';

describe('unnamed tray display', () => {
  it('derives each translated label without storing it as a name', () => {
    const group: Group = { id: 'new', name: '', type: 'group', isDeleted: true };
    expect(localizeUntitledGroup(group, '無題のトレイ')).toEqual({ ...group, name: '無題のトレイ' });
    expect(localizeUntitledGroup(group, 'Untitled Tray')).toEqual({ ...group, name: 'Untitled Tray' });
    expect(group.name).toBe('');
  });

  it('preserves explicit names even when they resemble a default label', () => {
    for (const name of ['My tray', '無題のトレイ', 'Untitled Tray']) {
      const group: Group = { id: 'named', name };
      expect(localizeUntitledGroup(group, 'Untitled Tray')).toBe(group);
    }
  });

  it('does not label separators', () => {
    const group: Group = { id: 'separator', name: '', type: 'separator' };
    expect(localizeUntitledGroup(group, 'Untitled Tray')).toBe(group);
  });
});
