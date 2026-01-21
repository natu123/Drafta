
import type { Note, Group } from './types';

export const groups: Group[] = [
  { id: 'inbox', name: 'Inbox' },
  { id: 'work', name: 'Work' },
  { id: 'personal', name: 'Personal' },
  { id: 'ai', name: 'AI Generated' },
];

export const notes: Note[] = [
  {
    id: 'note-1',
    title: 'Welcome to Drafta',
    icon: '🌱',
    content: `<h2>Organize your to-dos and thoughts seamlessly.</h2><hr /><h3>Drafta shapes raw thoughts into brilliant ideas.</h3><table><tbody><tr><th colspan="1" rowspan="1"><p>Raw Thought</p></th><th colspan="1" rowspan="1"><p>Brilliant Idea</p></th></tr><tr><td colspan="1" rowspan="1"><p><s>Scattered notes</s></p></td><td colspan="1" rowspan="1"><p>Structured Knowledge</p></td></tr><tr><td colspan="1" rowspan="1"><p><s>Rough ideas</s></p></td><td colspan="1" rowspan="1"><p>Polished Plans</p></td></tr></tbody></table><hr /><ul data-type="taskList"><li data-type="taskItem" data-checked="true"><label><input type="checkbox" checked="checked"><span></span></label><div><p>Capture notes any way you like.</p></div></li><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Track your daily tasks.</p></div></li></ul><hr /><pre><code class="language-sql">-- Start your journey
SELECT clarity FROM chaos;</code></pre><blockquote><p>Everything starts with a draft.</p></blockquote>`,
    plainTextContent: `Organize your to-dos and thoughts seamlessly. --- Drafta shapes raw thoughts into brilliant ideas. | Raw Thought | Brilliant Idea | |---|---| | ~~Scattered notes~~ | Structured Knowledge | | ~~Rough ideas~~ | Polished Plans | --- [x] Capture notes any way you like. [ ] Track your daily tasks. --- \`\`\`sql -- Start your journey SELECT clarity FROM chaos; \`\`\` > Everything starts with a draft.`,
    group: 'inbox',
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
    plainTextContent: `This is a quick reference for text formatting. You can use the toolbar to apply formatting like bold, italic, and strikethrough. This is an unordered list item. You can create lists to organize your thoughts. 1. This is an ordered list item. 2. Use them for step-by-step instructions.`,
    group: 'inbox',
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
    plainTextContent: 'Initial ideas for the next quarter project. Focus on improving user engagement and retention. Potential features: gamification, community forums, personalized recommendations.',
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
    plainTextContent: 'Milk Bread Eggs Cheese Apples',
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
    plainTextContent: 'Meeting with the design team.',
    group: 'work',
    stars: 0,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    lastAccessedAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    parentId: 'note-3',
  },
];
