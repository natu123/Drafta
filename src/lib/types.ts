export type Note = {
  id: string;
  title: string;
  icon?: string;
  content: string; // Can be HTML content from Tiptap
  plainTextContent?: string; // Plain text version of content
  group: string;
  stars: 0 | 1 | 2 | 3;
  isPinned?: boolean;
  createdAt: string;
  updatedAt: string;
  lastAccessedAt?: string;
  parentId?: string;
  children?: Note[];
  thumbnailUrl?: string;
};

export type Group = {
  id: string;
  name: string;
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
    type: 'note' | 'notes';
}
