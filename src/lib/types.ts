export type Note = {
  id: string;
  title: string;
  content: string;
  group: string;
  stars: 0 | 1 | 2 | 3;
  createdAt: string;
  updatedAt: string;
};

export type Group = {
  id: string;
  name: string;
};

export type ChatMessage = {
  id: string;
  author: 'user' | 'ai';
  content: string;
  timestamp: string;
};
