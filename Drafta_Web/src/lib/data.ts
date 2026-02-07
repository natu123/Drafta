
import type { Note, Group } from './types';

export const groups: Group[] = [
  { id: 'inbox', name: 'Inbox' },
  { id: 'todo', name: 'ToDo' },
  { id: 'work', name: 'Work' },
  { id: 'personal', name: 'Personal' },
  { id: 'ai', name: 'AI Generated' },
];

export const notes: Note[] = [
  {
    id: 'note-1',
    title: 'Welcome to Drafta',
    icon: '\u{1F331}',
    content: `<pre><code class="language-css">/* Welcome to Drafta! */
    .thought {
      state: brilliant;
    }</code></pre><p></p><h3><span style="color: #64A364"><em>Organize to-dos and thoughts seamlessly.</em></span></h3><ul data-type="taskList"><li data-type="taskItem" data-checked="true"><label><input type="checkbox" checked="checked"><span></span></label><div><p>Put your tasks in ToDo app, memos in note-taking app.</p></div></li><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Every thought in one place, Drafta!</p></div></li></ul><p></p><hr /><table><tbody><tr><th colspan="1" rowspan="1"><p>Before</p></th><th colspan="1" rowspan="1"><p><span style="color: #C49547">\u279B</span> After</p></th></tr><tr><td colspan="1" rowspan="1"><p><s>Scattered notes</s></p></td><td colspan="1" rowspan="1"><p>Structured Knowledge</p></td></tr><tr><td colspan="1" rowspan="1"><p><s>Rough thought</s></p></td><td colspan="1" rowspan="1"><p>Polished ideas</p></td></tr></tbody></table><p></p><hr /><blockquote><p>You're accelerating now!</p></blockquote>`,
    plainTextContent: `Organize to-dos and thoughts seamlessly. Put your tasks in ToDo app, memos in note-taking app. Every thought in one place, Drafta! Before \u279B After Scattered notes Structured Knowledge Rough thought Polished ideas You're accelerating now!`,
    group: 'inbox',
    stars: 3,
    isPinned: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    updatedAt: new Date().toISOString(),
    lastAccessedAt: new Date().toISOString(),
    thumbnailUrl: 'https://picsum.photos/seed/1/600/400',
    isProtected: true
  },
  {
    id: 'note-2',
    title: 'Quick Reference',
    icon: '\u{1F331}',
    content: `<p>Drafta supports standard Markdown syntax and powerful rich text features.</p><p></p><hr /><h3>Text Styling</h3><ul><li><p><strong>Bold</strong>: <code>**Bold**</code> or <code>{{Mod}}+B</code></p></li><li><p><em>Italic</em>: <code>*Italic*</code> or <code>{{Mod}}+I</code></p></li><li><p><s>Strikethrough</s>: <code>~~Strike~~</code> or <code>{{Mod}}+Shift+X</code></p></li><li><p><code>Inline Code</code>: <code>\`Code\`</code> or <code>{{Mod}}+E</code></p></li></ul><p></p><h4>Color Tags</h4><ul><li><p><span style="color: #64A364">Green</span> - Success, Growth</p></li><li><p><span style="color: #51A2FF">Blue</span> - Info, Links</p></li><li><p><span style="color: #AD46FF">Purple</span> - Creative, Special</p></li><li><p><span style="color: #E7A1B0">Rose</span> - Important, Highlight</p></li><li><p><span style="color: #C49547">Gold</span> - Warning, Priority</p></li><li><p><span style="color: #9CA3AF">Grey</span> - Muted, Secondary</p></li></ul><p></p><h3>Lists & Structure</h3><h4>Bullet List</h4><ul><li><p>Item A</p></li><li><p>Item B</p></li></ul><p></p><h4>Numbered List (Smart!)</h4><ol><li><p><strong>Define your goal</strong><br>What do you want to achieve?</p></li><li><p><strong>Break it into steps</strong><br>Small tasks are easier to tackle</p></li><li><p><strong>Execute daily</strong><br>Consistency beats intensity</p></li><li><p><strong>Review & iterate</strong><br>Adjust based on results</p></li></ol><p><span style="color: #9CA3AF"><em>Tip: Use Enter to continue numbering naturally.</em></span></p><p></p><h4>Task List</h4><ul data-type="taskList"><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Todo item</p></div></li><li data-type="taskItem" data-checked="true"><label><input type="checkbox" checked="checked"><span></span></label><div><p>Done item</p></div></li></ul><p></p><blockquote><p><strong>Quote</strong>: Use <code>&gt;</code> at the start of a line to create a blockquote.</p></blockquote><p></p><hr /><h3>Advanced</h3><h4>Code Blocks</h4><pre><code class="language-typescript">const drafta = "Awesome";
console.log(drafta);</code></pre><p></p><h4>Tables</h4><table><tbody><tr><th><p>Feature</p></th><th><p>Status</p></th></tr><tr><td><p>Markdown</p></td><td><p>Done</p></td></tr><tr><td><p>Rich Text</p></td><td><p>Done</p></td></tr></tbody></table><p></p><hr /><h3>Drafta Power Tips</h3><ul><li><p><strong>List/Grid View</strong>: Toggle layouts from the header.</p></li><li><p><strong>Organization</strong>: Drag notes to reorder.</p></li><li><p><strong>Focus Mode</strong>: Collapse the sidebar for distraction-free writing.</p></li><li><p><strong>Shortcuts</strong>: <code>/</code> for commands (coming soon!).</p></li></ul>`,
    plainTextContent: `Drafta supports standard Markdown syntax and powerful rich text features. Text Styling Bold Italic Strikethrough Inline Code Color Tags Green Blue Purple Rose Gold Grey Lists & Structure Bullet List Item A Item B Numbered List Define your goal Break it into steps Execute daily Review & iterate Task List Todo item Done item Quote Advanced Code Blocks Tables Feature Status Markdown Done Rich Text Done Drafta Power Tips List/Grid View Organization Focus Mode Shortcuts`,
    group: 'inbox',
    stars: 2,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    lastAccessedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    parentId: 'note-1',
    thumbnailUrl: 'https://picsum.photos/seed/2/600/400',
    isProtected: true
  },
  {
    id: 'note-3',
    title: '(example) Q3 Project Brainstorming',
    icon: '\u{1F4A1}',
    content: `<h2>Project Goals</h2><p>Focus on improving <strong>user engagement</strong> and <strong>retention</strong>.</p><h3>Key Features</h3><ul><li><p>\u{1F3AE} <strong>Gamification</strong> - Points, badges, streaks</p></li><li><p>\u{1F4AC} <strong>Community Forums</strong> - User discussions</p></li><li><p>\u{1F3AF} <strong>Personalized Recommendations</strong> - AI-driven suggestions</p></li></ul><hr /><h3>Data Structure Draft</h3><pre><code class="language-json">{
  "user": {
    "id": "u_123",
    "gamification": {
      "points": 1500,
      "badges": ["early_adopter", "power_user"],
      "streak_days": 14
    }
  }
}</code></pre><h3>Timeline</h3><table><tbody><tr><th colspan="1" rowspan="1"><p>Phase</p></th><th colspan="1" rowspan="1"><p>Duration</p></th><th colspan="1" rowspan="1"><p>Status</p></th></tr><tr><td colspan="1" rowspan="1"><p>Research</p></td><td colspan="1" rowspan="1"><p>2 weeks</p></td><td colspan="1" rowspan="1"><p>\u2705 Done</p></td></tr><tr><td colspan="1" rowspan="1"><p>Design</p></td><td colspan="1" rowspan="1"><p>3 weeks</p></td><td colspan="1" rowspan="1"><p>\u{1F504} In Progress</p></td></tr><tr><td colspan="1" rowspan="1"><p>Development</p></td><td colspan="1" rowspan="1"><p>6 weeks</p></td><td colspan="1" rowspan="1"><p>\u23F3 Pending</p></td></tr></tbody></table><blockquote><p>Ship fast, iterate faster!</p></blockquote>`,
    plainTextContent: `Project Goals Focus on improving user engagement and retention. Key Features \u{1F3AE} Gamification - Points, badges, streaks \u{1F4AC} Community Forums - User discussions \u{1F3AF} Personalized Recommendations - AI-driven suggestions Data Structure Draft Timeline Phase Duration Status Research 2 weeks \u2705 Done Design 3 weeks \u{1F504} In Progress Development 6 weeks \u23F3 Pending Ship fast, iterate faster!`,
    group: 'work',
    stars: 1,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    lastAccessedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    thumbnailUrl: 'https://picsum.photos/seed/3/600/400'
  },
  {
    id: 'note-4',
    title: '(example) Weekly Grocery List',
    icon: '\u{1F6D2}',
    content: `<h3>\u{1F95B} Dairy</h3><ul data-type="taskList"><li data-type="taskItem" data-checked="true"><label><input type="checkbox" checked="checked"><span></span></label><div><p>Milk (2L)</p></div></li><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Greek Yogurt</p></div></li><li data-type="taskItem" data-checked="true"><label><input type="checkbox" checked="checked"><span></span></label><div><p>Cheddar Cheese</p></div></li></ul><h3>\u{1F35E} Bakery</h3><ul data-type="taskList"><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Whole Wheat Bread</p></div></li><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Croissants (4 pack)</p></div></li></ul><h3>\u{1F34E} Produce</h3><ul data-type="taskList"><li data-type="taskItem" data-checked="true"><label><input type="checkbox" checked="checked"><span></span></label><div><p>Apples</p></div></li><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Bananas</p></div></li><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Spinach</p></div></li></ul><hr /><h3>Budget Planner</h3><table><tbody><tr><th colspan="1" rowspan="1"><p>Category</p></th><th colspan="1" rowspan="1"><p>Est. Cost</p></th></tr><tr><td colspan="1" rowspan="1"><p>Dairy</p></td><td colspan="1" rowspan="1"><p>$15.00</p></td></tr><tr><td colspan="1" rowspan="1"><p>Bakery</p></td><td colspan="1" rowspan="1"><p>$8.50</p></td></tr><tr><td colspan="1" rowspan="1"><p>Produce</p></td><td colspan="1" rowspan="1"><p>$12.00</p></td></tr><tr><td colspan="1" rowspan="1"><p><strong>Total</strong></p></td><td colspan="1" rowspan="1"><p><strong>$35.50</strong></p></td></tr></tbody></table>`,
    plainTextContent: `\u{1F95B} Dairy Milk (2L) Greek Yogurt Cheddar Cheese \u{1F35E} Bakery Whole Wheat Bread Croissants (4 pack) \u{1F34E} Produce Apples Bananas Spinach Budget Planner Category Est. Cost Dairy $15.00 Bakery $8.50 Produce $12.00 Total $35.50`,
    group: 'personal',
    stars: 0,
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    lastAccessedAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  },
  {
    id: 'note-5',
    title: '(example) Design Team Meeting',
    icon: '\u{1F4BC}',
    content: `<h2>Meeting Notes - Jan 15</h2><p><strong>Attendees:</strong> Alex, Jamie, Sam, Taylor</p><hr /><h3>Agenda</h3><ol><li><p>Review Q4 metrics</p></li><li><p>Discuss new color system</p></li><li><p>Plan user testing sessions</p></li></ol><h3>Deployment Plan</h3><pre><code class="language-bash"># Run tests before deploying
npm run test:ui

# Build production bundle
npm run build:prod

# Deploy to staging
vercel deploy --prebuilt</code></pre><h3>Action Items</h3><ul data-type="taskList"><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Alex: Prepare color palette documentation</p></div></li><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Jamie: Draft user testing script</p></div></li><li data-type="taskItem" data-checked="true"><label><input type="checkbox" checked="checked"><span></span></label><div><p>Sam: Update Figma components</p></div></li></ul><blockquote><p>Next meeting: Jan 22, 10:00 AM</p></blockquote>`,
    plainTextContent: `Meeting Notes - Jan 15 Attendees: Alex, Jamie, Sam, Taylor Agenda Review Q4 metrics Discuss new color system Plan user testing sessions Deployment Plan Action Items Alex: Prepare color palette documentation Jamie: Draft user testing script Sam: Update Figma components Next meeting: Jan 22, 10:00 AM`,
    group: 'work',
    stars: 0,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    lastAccessedAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    parentId: 'note-3',
  },
  {
    id: 'note-6',
    title: 'Submit project proposal',
    icon: '\u{1F525}',
    content: `<p></p>`,
    plainTextContent: ``,
    group: 'todo',
    stars: 2,
    isPinned: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    lastAccessedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
  {
    id: 'note-7',
    title: 'Review team feedback',
    icon: '\u{1F4BC}',
    content: `<p></p>`,
    plainTextContent: ``,
    group: 'todo',
    stars: 0,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 10).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    lastAccessedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: 'note-8',
    title: 'Schedule client meeting',
    icon: '\u{1F4DD}',
    content: `<p></p>`,
    plainTextContent: ``,
    group: 'todo',
    stars: 1,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 1).toISOString(),
    lastAccessedAt: new Date(Date.now() - 1000 * 60 * 60 * 1).toISOString(),
  },
  {
    id: 'note-9',
    title: 'Buy groceries',
    icon: '\u{1F6D2}',
    content: `<p></p>`,
    plainTextContent: ``,
    group: 'todo',
    stars: 0,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    lastAccessedAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
  },
];
