export type Note = {
  id: string;
  title: string;
  icon?: string;
  content: string; // Can be HTML content from Tiptap
  plainTextContent?: string; // Plain text version of content
  group: string;
  stars: 0 | 1 | 2 | 3;
  createdAt: string;
  updatedAt: string;
  lastAccessedAt?: string;
  thumbnailUrl?: string;
  isPinned?: boolean;
  parentId?: string;
  children?: Note[];
  isDeleted?: boolean;
};

export type Group = {
  id: string;
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
