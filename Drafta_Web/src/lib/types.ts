export type Note = {
  id: string;
  type?: 'note' | 'separator';
  title: string;
  icon?: string;
  content: string; // Can be HTML content from Tiptap, or LAZY_CONTENT until the memo is opened (specs/17)
  /** Points at the stored memo while `content` is LAZY_CONTENT; ignored once real HTML is set. */
  source?: object;
  plainTextContent?: string; // Plain text version of content
  group: string;
  stars: 0 | 1 | 2 | 3;
  createdAt: string;
  updatedAt: string;
  lastAccessedAt?: string;
  thumbnailUrl?: string;
  isPinned?: boolean;
  isCompleted?: boolean;
  parentId?: string;
  children?: Note[];
  isDeleted?: boolean;
  isProtected?: boolean;
  sampleKey?: 'welcome' | 'reference' | 'brainstorm' | 'groceries' | 'meeting' | 'todo';
};

export type Group = {
  id: string;
  isPinned?: boolean;
  type?: 'group' | 'separator';
  name: string;
  isDeleted?: boolean;
};

export type HistoryItem = {
  id: string;
  type: 'note';
  title: string;
  icon?: string;
  accessedAt: string;
}

export type OpenTab = {
  id: string;
  type: 'note';
}
