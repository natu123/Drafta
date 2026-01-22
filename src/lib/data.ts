
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
    content: `<h3><span style="color: #64A364"><em>Organize to-dos and thoughts seamlessly.</em></span></h3><table><tbody><tr><th colspan="1" rowspan="1"><p>Before</p></th><th colspan="1" rowspan="1"><p>➛ After</p></th></tr><tr><td colspan="1" rowspan="1"><p><s>Scattered notes</s></p></td><td colspan="1" rowspan="1"><p>Structured Knowledge</p></td></tr><tr><td colspan="1" rowspan="1"><p><s>Rough thought</s></p></td><td colspan="1" rowspan="1"><p>Polished ideas</p></td></tr></tbody></table><p></p><hr /><ul data-type="taskList"><li data-type="taskItem" data-checked="true"><label><input type="checkbox" checked="checked"><span></span></label><div><p>Put your tasks in ToDo app, memos in note-taking app.</p></div></li><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Every thought in one place, Drafta!</p></div></li></ul><p></p><hr /><pre><code class="language-css">/* Welcome to Drafta! */
    .thought {
      state: brilliant;
    }</code></pre><blockquote><p>You're accelerating now!</p></blockquote>`,
    plainTextContent: `### _Organize to-dos and thoughts seamlessly._
| Before | ➛ After |
| --- | --- |
| ~~Scattered notes~~ | Structured Knowledge |
| ~~Rough thought~~ | Polished ideas |

---
- [x] Put your tasks in ToDo app, memos in note-taking app.
- [ ] Every thought in one place, Drafta!

---
\`\`\`css
/* Welcome to Drafta! */
.thought {
  state: brilliant;
}
\`\`\`
> You're accelerating now!`,
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
    icon: '🌱',
    content: `<p>This is a quick reference for text formatting.</p><p></p><p>You can use the toolbar to apply formatting like bold, italic, and strikethrough.</p><p></p><ul><li><p>This is an unordered list item.</p></li><li><p>You can create lists to organize your thoughts.</p></li></ul><p></p><ol><li><p>This is an ordered list item.</p></li><li><p>Use them for step-by-step instructions.</p></li></ol>`,
    plainTextContent: `This is a quick reference for text formatting. You can use the toolbar to apply formatting like bold, italic, and strikethrough. This is an unordered list item. You can create lists to organize your thoughts. 1. This is an ordered list item. 2. Use them for step-by-step instructions.`,
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
    icon: '💡',
    content: `<h2>Project Goals</h2><p>Focus on improving <strong>user engagement</strong> and <strong>retention</strong>.</p><h3>Key Features</h3><ul><li><p>🎮 <strong>Gamification</strong> - Points, badges, streaks</p></li><li><p>💬 <strong>Community Forums</strong> - User discussions</p></li><li><p>🎯 <strong>Personalized Recommendations</strong> - AI-driven suggestions</p></li></ul><hr /><h3>Data Structure Draft</h3><pre><code class="language-json">{
  "user": {
    "id": "u_123",
    "gamification": {
      "points": 1500,
      "badges": ["early_adopter", "power_user"],
      "streak_days": 14
    }
  }
}</code></pre><h3>Timeline</h3><table><tbody><tr><th colspan="1" rowspan="1"><p>Phase</p></th><th colspan="1" rowspan="1"><p>Duration</p></th><th colspan="1" rowspan="1"><p>Status</p></th></tr><tr><td colspan="1" rowspan="1"><p>Research</p></td><td colspan="1" rowspan="1"><p>2 weeks</p></td><td colspan="1" rowspan="1"><p>✅ Done</p></td></tr><tr><td colspan="1" rowspan="1"><p>Design</p></td><td colspan="1" rowspan="1"><p>3 weeks</p></td><td colspan="1" rowspan="1"><p>🔄 In Progress</p></td></tr><tr><td colspan="1" rowspan="1"><p>Development</p></td><td colspan="1" rowspan="1"><p>6 weeks</p></td><td colspan="1" rowspan="1"><p>⏳ Pending</p></td></tr></tbody></table><blockquote><p>Ship fast, iterate faster!</p></blockquote>`,
    plainTextContent: `## Project Goals
Focus on improving **user engagement** and **retention**.

### Key Features
- 🎮 **Gamification** - Points, badges, streaks
- 💬 **Community Forums** - User discussions
- 🎯 **Personalized Recommendations** - AI-driven suggestions

---

### Data Structure Draft
\`\`\`json
{
  "user": {
    "id": "u_123",
    "gamification": {
      "points": 1500,
      "badges": ["early_adopter", "power_user"],
      "streak_days": 14
    }
  }
}
\`\`\`

### Timeline
| Phase | Duration | Status |
| --- | --- | --- |
| Research | 2 weeks | ✅ Done |
| Design | 3 weeks | 🔄 In Progress |
| Development | 6 weeks | ⏳ Pending |

> Ship fast, iterate faster!`,
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
    icon: '🛒',
    content: `<h3>🥛 Dairy</h3><ul data-type="taskList"><li data-type="taskItem" data-checked="true"><label><input type="checkbox" checked="checked"><span></span></label><div><p>Milk (2L)</p></div></li><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Greek Yogurt</p></div></li><li data-type="taskItem" data-checked="true"><label><input type="checkbox" checked="checked"><span></span></label><div><p>Cheddar Cheese</p></div></li></ul><h3>🍞 Bakery</h3><ul data-type="taskList"><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Whole Wheat Bread</p></div></li><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Croissants (4 pack)</p></div></li></ul><h3>🍎 Produce</h3><ul data-type="taskList"><li data-type="taskItem" data-checked="true"><label><input type="checkbox" checked="checked"><span></span></label><div><p>Apples</p></div></li><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Bananas</p></div></li><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Spinach</p></div></li></ul><hr /><h3>Budget Planner</h3><table><tbody><tr><th colspan="1" rowspan="1"><p>Category</p></th><th colspan="1" rowspan="1"><p>Est. Cost</p></th></tr><tr><td colspan="1" rowspan="1"><p>Dairy</p></td><td colspan="1" rowspan="1"><p>$15.00</p></td></tr><tr><td colspan="1" rowspan="1"><p>Bakery</p></td><td colspan="1" rowspan="1"><p>$8.50</p></td></tr><tr><td colspan="1" rowspan="1"><p>Produce</p></td><td colspan="1" rowspan="1"><p>$12.00</p></td></tr><tr><td colspan="1" rowspan="1"><p><strong>Total</strong></p></td><td colspan="1" rowspan="1"><p><strong>$35.50</strong></p></td></tr></tbody></table>`,
    plainTextContent: `### 🥛 Dairy
- [x] Milk (2L)
- [ ] Greek Yogurt
- [x] Cheddar Cheese

### 🍞 Bakery
- [ ] Whole Wheat Bread
- [ ] Croissants (4 pack)

### 🍎 Produce
- [x] Apples
- [ ] Bananas
- [ ] Spinach

---

### Budget Planner
| Category | Est. Cost |
| --- | --- |
| Dairy | $15.00 |
| Bakery | $8.50 |
| Produce | $12.00 |
| **Total** | **$35.50** |`,
    group: 'personal',
    stars: 0,
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    lastAccessedAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  },
  {
    id: 'note-5',
    title: '(example) Design Team Meeting',
    icon: '💼',
    content: `<h2>Meeting Notes - Jan 15</h2><p><strong>Attendees:</strong> Alex, Jamie, Sam, Taylor</p><hr /><h3>Agenda</h3><ol><li><p>Review Q4 metrics</p></li><li><p>Discuss new color system</p></li><li><p>Plan user testing sessions</p></li></ol><h3>Deployment Plan</h3><pre><code class="language-bash"># Run tests before deploying
npm run test:ui

# Build production bundle
npm run build:prod

# Deploy to staging
vercel deploy --prebuilt</code></pre><h3>Action Items</h3><ul data-type="taskList"><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Alex: Prepare color palette documentation</p></div></li><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Jamie: Draft user testing script</p></div></li><li data-type="taskItem" data-checked="true"><label><input type="checkbox" checked="checked"><span></span></label><div><p>Sam: Update Figma components</p></div></li></ul><blockquote><p>Next meeting: Jan 22, 10:00 AM</p></blockquote>`,
    plainTextContent: `## Meeting Notes - Jan 15
**Attendees:** Alex, Jamie, Sam, Taylor

---

### Agenda
1. Review Q4 metrics
2. Discuss new color system
3. Plan user testing sessions

### Deployment Plan
\`\`\`bash
# Run tests before deploying
npm run test:ui

# Build production bundle
npm run build:prod

# Deploy to staging
vercel deploy --prebuilt
\`\`\`

### Action Items
- [ ] Alex: Prepare color palette documentation
- [ ] Jamie: Draft user testing script
- [x] Sam: Update Figma components

> Next meeting: Jan 22, 10:00 AM`,
    group: 'work',
    stars: 0,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    lastAccessedAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    parentId: 'note-3',
  },
];
