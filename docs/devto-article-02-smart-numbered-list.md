---
title: Claude Code Stuck on ProseMirror List Numbering: How I Fixed It with Dynamic startFrom Recalculation
published: false
description: Numbered lists lose their sequence when split by paragraphs. The fix requires dynamic recalculation of startFrom attribute on every update.
tags: claudecode, tiptap, prosemirror, javascript
series: Claude Code Debugging Chronicles
---

## The Problem

I wanted "smart" numbered lists that maintain their sequence even when split by paragraphs:

**Expected behavior:**

```
1. Apple
2. Banana

3. Cherry  ← continues from 2
4. Date
```

**Actual behavior (default TipTap/ProseMirror):**

```
1. Apple
2. Banana

1. Cherry  ← resets to 1!
2. Date
```

When pressing Enter on an empty list item, the list splits and the second list resets to 1.

## Why Claude Code Got Stuck

This problem was deceptively complex:

1. **Multiple failed approaches** — Tried `newList` boolean flag, list grouping by ID, and fixed `startFrom` values
2. **TipTap's `liftListItem` copies attributes** — When splitting a list, the new list inherits the original's attributes
3. **Can't distinguish "new list" from "split list"** — Both end up with `startFrom=1`

Claude Code spent many iterations trying:
- Boolean `newList` flag → Failed because split lists copy the flag
- List group IDs → Too complex, collision issues
- Fixed `startFrom` on creation → Breaks when lists are split multiple times

## Root Cause Analysis

The fundamental issue: **a static attribute can't handle dynamic list operations**.

When you split a list:
1. `liftListItem` creates a new `orderedList` node
2. The new list copies attributes from the original (including `startFrom=1`)
3. There's no way to know if `startFrom=1` means "intentionally new" or "accidentally copied"

**The key insight**: Instead of storing the correct number, store the **intent** (`startFrom=1` = new list, `startFrom≠1` = continuation) and **recalculate on every update**.

## The Solution

**Strategy: Dynamic recalculation on every document update**

**1. Custom OrderedList with `startFrom` attribute:**

```typescript
// custom-ordered-list.ts
import OrderedList from '@tiptap/extension-ordered-list'

export const CustomOrderedList = OrderedList.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      startFrom: {
        default: 1,
        parseHTML: element => {
          const start = element.getAttribute('start')
          return start ? parseInt(start, 10) : 1
        },
        renderHTML: attributes => {
          return { start: attributes.startFrom ?? 1 }
        },
      },
    }
  },
})
```

**2. Recalculate all lists on every update:**

```typescript
// In your editor component
const renumberAllOrderedLists = (editorInstance: Editor) => {
  const { state, view } = editorInstance
  const { doc } = state
  const tr = state.tr
  let needsUpdate = false
  let runningNumber = 0

  // Collect all orderedLists
  const lists: { pos: number; node: any }[] = []
  doc.descendants((node, pos) => {
    if (node.type.name === 'orderedList') {
      lists.push({ pos, node })
    }
  })

  // Recalculate startFrom for each list
  for (const { pos, node } of lists) {
    const currentStartFrom = node.attrs.startFrom ?? 1

    if (currentStartFrom === 1) {
      // New list group: start from 1
      runningNumber = 1 + node.childCount
    } else {
      // Continuation: should start from runningNumber
      if (currentStartFrom !== runningNumber) {
        tr.setNodeMarkup(pos, undefined, {
          ...node.attrs,
          startFrom: runningNumber
        })
        needsUpdate = true
      }
      runningNumber = runningNumber + node.childCount
    }

    // Update list item values
    let itemIndex = 0
    const effectiveStartFrom = currentStartFrom === 1 ? 1 : runningNumber - node.childCount
    node.forEach((itemNode, offset) => {
      if (itemNode.type.name === 'listItem') {
        const newValue = effectiveStartFrom + itemIndex
        const itemPos = pos + 1 + offset
        if (itemNode.attrs.value !== newValue) {
          tr.setNodeMarkup(itemPos, undefined, {
            ...itemNode.attrs,
            value: newValue
          })
          needsUpdate = true
        }
        itemIndex++
      }
    })
  }

  if (needsUpdate && tr.docChanged) {
    view.dispatch(tr)
  }
}

// Call on every update
const editor = useEditor({
  // ...
  onUpdate: ({ editor }) => {
    setTimeout(() => renumberAllOrderedLists(editor), 0)
  },
})
```

**3. Mark split lists as "continuation" (the key trick!):**

```typescript
// custom-list-item.ts - Enter key handler
Enter: ({ editor }) => {
  // ... find listItem depth ...

  if (isEmpty) {
    const result = editor.commands.liftListItem('listItem')

    if (result) {
      // After split, mark the new list as "continuation"
      requestAnimationFrame(() => {
        const { state, view } = editor
        const { doc, selection } = state
        const cursorPos = selection.from
        const tr = state.tr

        // Find the first orderedList after cursor
        let found = false
        doc.descendants((node, pos) => {
          if (found) return false
          if (node.type.name === 'orderedList' && pos > cursorPos) {
            found = true
            // Set startFrom to 2 (any non-1 value marks it as continuation)
            if (node.attrs.startFrom === 1) {
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                startFrom: 2  // Temporary value, recalculated on next update
              })
            }
            return false
          }
        })

        if (tr.docChanged) view.dispatch(tr)
      })
    }
    return result
  }

  return editor.commands.splitListItem('listItem')
}
```

## Key Takeaways for AI Agents

**Claude Code users: if you're hitting this, try:**

1. Don't use boolean flags for list grouping — `liftListItem` copies all attributes
2. Use `startFrom=1` as "new list" marker, `startFrom≠1` as "continuation" marker
3. Recalculate all list numbers on **every** document update (computed, not stored)
4. After `liftListItem`, use `requestAnimationFrame` to mark the split list as continuation

**The breakthrough insight:**
> "Computed over stored" — For data affected by user edits, recalculating on every update is more robust than trying to maintain correct values through all possible operations.

**Keywords for search:**
ProseMirror ordered list numbering, TipTap list split reset, liftListItem copies attributes, orderedList startFrom attribute, smart numbered list TipTap, list continuation after paragraph

---

*This article is part of the "Claude Code Debugging Chronicles" series, documenting real debugging sessions with AI coding assistants.*

**Related Articles:**
- [Part 1: TipTap v3 Title Placeholder Fix](https://dev.to/gles/claude-code-stuck-on-tiptap-v3-title-placeholder-how-i-fixed-it-with-custom-title-node-27ni)
