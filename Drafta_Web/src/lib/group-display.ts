import type { Group } from './types';

export function localizeUntitledGroup(group: Group, untitledName: string): Group {
  if (group.type === 'separator' || group.name) return group;
  return { ...group, name: untitledName };
}
