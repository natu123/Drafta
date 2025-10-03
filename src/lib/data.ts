
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
    content: `Prōla is your all-in-one idea hub: 
"where notes, the web, and AI connect seamlessly."

With Prōla, you can:
● Capture notes any way you like—handwriting, voice, or markdown.
● Browse and organize multiple web pages in a clean, organized way.
● Chat with AI to summarize, create, and explore ideas instantly.

No more switching between apps.
Everything you need to collect, connect, and create, all in Prōla.

Prōla shapes raw thoughts into brilliant ideas.
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
        authorName: '[DEMO] DeepSeek-V3 (Auto)',
        content: 'Hello! How can I assist you today? You can ask me to summarize the current note, generate a new draft, or just chat.',
        timestamp: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
    },
]
