
import type { Note, Group, Talk, ChatMessage } from './types';

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
    icon: '🌱',
    content: `<p>Prōla is your all-in-one idea hub: </p><p>"where notes, the web, and AI connect seamlessly."</p><p></p><p>With Prōla, you can:</p><p>● Capture notes any way you like—handwriting, voice, or markdown.</p><p>● Browse and organize multiple web pages in a clean, organized way.</p><p>● Chat with AI to summarize, create, and explore ideas instantly.</p><p></p><p>No more switching between apps.</p><p>Everything you need to collect, connect, and create, all in Prōla.</p><p></p><p>Prōla shapes raw thoughts into brilliant ideas.</p>`,
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
    content: `<p>This is a quick reference for text formatting.</p><p></p><p>You can use the toolbar to apply formatting like bold, italic, and strikethrough.</p><p></p><ul><li><p>This is an unordered list item.</p></li><li><p>You can create lists to organize your thoughts.</p></li></ul><p></p><ol><li><p>This is an ordered list item.</p></li><li><p>Use them for step-by-step instructions.</p></li></ol>`,
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
    content: '<p>Initial ideas for the next quarter project. Focus on improving user engagement and retention. Potential features: gamification, community forums, personalized recommendations.</p>',
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
    content: '<ul><li><p>Milk</p></li><li><p>Bread</p></li><li><p>Eggs</p></li><li><p>Cheese</p></li><li><p>Apples</p></li></ul>',
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
    content: '<p>Meeting with the design team.</p>',
    group: 'work',
    stars: 0,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    lastAccessedAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    parentId: 'note-3',
  },
];

const initialChatMessages: ChatMessage[] = [
    {
        id: 'chat-1',
        author: 'ai',
        authorName: '[DEMO] DeepSeek-V3 (Auto)',
        content: 'Hello! How can I assist you today? You can ask me to summarize the current note, generate a new draft, or just chat.',
        timestamp: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
    },
]

export const talks: Talk[] = [];

export const chatMessages: ChatMessage[] = initialChatMessages;

    