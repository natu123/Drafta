export type Note = {
  id: string;
  title: string;
  icon?: string;
  content: string;
  group: string;
  stars: 0 | 1 | 2 | 3;
  isPinned?: boolean;
  createdAt: string;
  updatedAt: string;
  lastAccessedAt?: string;
  parentId?: string;
  children?: Note[];
  thumbnailUrl?: string;
  titleColor?: string;
  contentColor?: string;
};

export type Web = {
  id: string;
  title: string;
  url: string;
  icon?: string;
  createdAt: string;
  updatedAt: string;
  lastAccessedAt?: string;
  parentId?: string;
  children?: Web[];
  thumbnailUrl?: string;
}

export type Group = {
  id: string;
  name: string;
};

export type ChatMessage = {
  id:string;
  author: 'user' | 'ai';
  content: string;
  timestamp: string;
};

export type HistoryItem = {
  id: string;
  type: 'note' | 'web';
  title: string;
  icon?: string;
  accessedAt: string;
}
