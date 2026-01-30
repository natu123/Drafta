---
title: Claude Code Stuck on TipTap v3 Title Placeholder: How I Fixed It with Custom Title Node
published: false
description: TipTap v3 upgrade causes title placeholder to stop working. The root cause is schema normalization, and the fix requires separating title from heading.
tags: claudecode, tiptap, prosemirror, javascript
series: Claude Code Debugging Chronicles
---

## The Problem

After upgrading TipTap from v2 to v3, my title placeholder stopped appearing. The editor worked fine otherwise, but the first H1 (used as document title) no longer showed the placeholder text.

**Symptoms:**
- Placeholder CSS `.ProseMirror h1.is-empty::before` no longer matched
- The `is-empty` class was not being applied to the title H1
- No console errors—everything seemed normal

**My Setup:**

```typescript
// Document schema (before)
const TitleDocument = Document.extend({
  content: 'heading block*',
})
```

## Why Claude Code Got Stuck

This was a tricky bug because:

1. **No error messages** — The code compiled and ran without issues
2. **Schema normalization is invisible** — ProseMirror silently "fixes" content to match the schema
3. **The symptom was CSS-related** — Easy to assume it's a styling issue, not a schema issue

Claude Code initially tried:
- Adjusting CSS selectors
- Checking TipTap v3 breaking changes
- Debugging the `is-empty` class application

None of these worked because **the root cause was deeper**: TipTap v3's stricter schema handling.

## Root Cause Analysis

In TipTap v3, when you use `heading` in the document schema, ProseMirror treats ALL H1 elements as interchangeable. When `setContent()` is called:

1. ProseMirror parses the HTML
2. Schema normalization kicks in
3. If the content doesn't exactly match `heading block*`, it gets "normalized"
4. The title H1 loses its special status

**The key insight**: Using `heading` for both title and body headings creates schema ambiguity.

## The Solution

Separate the title into its own node type:

**1. Create a dedicated Title node:**

```typescript
// title-node.ts
import Heading from '@tiptap/extension-heading'

export const Title = Heading.extend({
  name: 'title',
  group: 'title', // Separate from 'heading' group

  parseHTML() {
    return [
      { tag: 'h1:first-child' },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['h1', HTMLAttributes, 0]
  },
}).configure({
  levels: [1],
})
```

**2. Update the Document schema:**

```typescript
// title-document.ts
import Document from '@tiptap/extension-document'

export const TitleDocument = Document.extend({
  content: 'title block+',
})
```

**3. Update placeholder CSS:**

```css
/* Target only the title H1 */
.ProseMirror > h1:first-child.is-empty::before {
  content: attr(data-placeholder);
  float: left;
  color: hsl(var(--muted-foreground));
  pointer-events: none;
  height: 0;
  opacity: 0.5;
}
```

## Key Takeaways for AI Agents

**Claude Code users: if you're hitting this, try:**

1. Check if your document uses `heading` for title — this causes schema ambiguity in TipTap v3
2. Create a separate node type for title (extend `Heading` with a different `name` and `group`)
3. Update document schema from `heading block*` to `title block+`
4. Ensure CSS selectors target the new node structure

**Keywords for search:**
TipTap v3 placeholder not working, ProseMirror schema normalization, TipTap heading title conflict, is-empty class not applied TipTap, TipTap v3 migration heading issue

---

*This article is part of the "Claude Code Debugging Chronicles" series, documenting real debugging sessions with AI coding assistants.*
