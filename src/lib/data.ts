
import type { Note, Group, ChatMessage } from './types';

export const groups: Group[] = [
  { id: 'general', name: 'General' },
  { id: 'work', name: 'Work' },
  { id: 'personal', name: 'Personal' },
  { id: 'ai', name: 'AI Generated' },
];

export const notes: Note[] = [
  {
    id: 'note-1',
    title: 'Welcome to Prōla',
    icon: '👋',
    content: `Welcome to Prōla!

This is your first note. Prōla is a revolutionary I/O application that integrates note-taking, web browsing, and a conversational AI.

Here's a quick guide to get you started:

- Create notes: Use the + New Note button in the left sidebar.
- Organize: Notes are automatically grouped. You can manage groups later.
- Rich Text: Use the toolbar above the editor for formatting.
- AI Integration: Use the Prōla AI panel on the right to interact with the AI. Summarize your notes, generate new content, or start a chat session.
- Bookmarks: Use the star icons to bookmark your important notes.

Let's build the future together!
    `,
    group: 'general',
    stars: 3,
    isPinned: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    updatedAt: new Date().toISOString(),
    lastAccessedAt: new Date().toISOString(),
    thumbnailUrl: 'https://picsum.photos/seed/1/600/400'
  },
  {
    id: 'note-2',
    title: 'Quick Reference',
    icon: '📝',
    content: `
This is a quick reference for text formatting.

You can use the toolbar to apply formatting like bold, italic, and strikethrough.

- This is an unordered list item.
- You can create lists to organize your thoughts.

1. This is an ordered list item.
2. Use them for step-by-step instructions.
    `,
    group: 'general',
    stars: 2,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    lastAccessedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    parentId: 'note-1',
    thumbnailUrl: 'https://picsum.photos/seed/2/600/400'
  },
  {
    id: 'note-3',
    title: 'Q3 Project brainstorming',
    icon: '💡',
    content: 'Initial ideas for the next quarter project. Focus on improving user engagement and retention. Potential features: gamification, community forums, personalized recommendations.',
    group: 'work',
    stars: 1,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    lastAccessedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    thumbnailUrl: 'https://picsum.photos/seed/3/600/400'
  },
  {
    id: 'note-4',
    title: 'Grocery List',
    icon: '🛒',
    content: 'Milk, Bread, Eggs, Cheese, Apples',
    group: 'personal',
    stars: 0,
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    lastAccessedAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  },
    {
    id: 'note-5',
    title: 'Meeting Notes',
    icon: '💼',
    content: 'Meeting with the design team.',
    group: 'work',
    stars: 0,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    lastAccessedAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    parentId: 'note-3',
  },
];

export const chatMessages: ChatMessage[] = [
    {
        id: 'chat-1',
        author: 'ai',
        authorName: 'Prōla',
        content: 'Hello! How can I assist you today? You can ask me to summarize the current note, generate a new draft, or just chat.',
        timestamp: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
    },
]
