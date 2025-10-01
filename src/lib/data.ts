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
    title: 'Welcome to Draftio × Prōla',
    icon: '👋',
    content: `
# Welcome to Draftio × Prōla!

This is your first note. Here's a quick guide to get you started:

- **Create notes:** Use the **+ New Note** button in the left sidebar.
- **Organize:** Notes are automatically grouped. You can manage groups later.
- **Rich Text:** Use Markdown for formatting. A toolbar is available above the editor.
- **AI Integration:** Use the Prōla panel on the right to interact with AI. Summarize your notes, generate new content, or start a chat session.
- **Bookmarks:** Use the star icons to bookmark your important notes.

Happy note-taking!
    `,
    group: 'general',
    stars: 3,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'note-2',
    title: 'Markdown Cheatsheet',
    icon: '📝',
    content: `
## Basic Syntax

# H1
## H2
### H3

**Bold Text** or __Bold Text__
*Italic Text* or _Italic Text_
~~Strikethrough~~

> Blockquote

- Unordered List Item 1
- Unordered List Item 2

1. Ordered List Item 1
2. Ordered List Item 2

\`inline code\`

\`\`\`
// code block
function hello() {
  console.log("Hello, World!");
}
\`\`\`

---
    `,
    group: 'general',
    stars: 2,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
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
  },
];

export const chatMessages: ChatMessage[] = [
    {
        id: 'chat-1',
        author: 'ai',
        content: 'Hello! How can I assist you today? You can ask me to summarize the current note, generate a new draft, or just chat.',
        timestamp: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
    },
]
