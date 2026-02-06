---
title: Claude Code Stuck on Vertical Scroll Not Working: Flex Children Need minHeight
tags: claudecode, css, flexbox, layout
---

## The Problem

I had a 3-column layout using Flexbox. When the browser window was resized vertically, the content got cut off with no scrollbar appearing.

```jsx
<div className="flex h-screen overflow-auto">
  <div className="flex-1">Column 1</div>
  <div className="flex-1">Column 2</div>
  <div className="flex-1">Column 3</div>
</div>
```

**Expected:** Vertical scrollbar appears when window is too short.

**Actual:** Content just disappears. No scrollbar. The columns shrink with the window.

## Why Claude Code Got Stuck

Claude Code initially thought "the browser can't scroll - maybe this is a browser limitation." The debugging went through several wrong directions:

1. Adding `overflow-y: auto` to the container (already had it)
2. Checking if content was being clipped by `overflow: hidden` somewhere
3. Considering it a "browser limitation" for web apps

The real issue was never about overflow settings. It was about **what was actually overflowing**.

## Root Cause Analysis

Flexbox children **shrink by default** to fit their parent. When you resize the window:

1. The parent container shrinks (because `h-screen` follows viewport)
2. The flex children shrink to fit (default `flex-shrink: 1`)
3. Nothing overflows because everything just gets smaller
4. No overflow = no scrollbar

The container had `overflow: auto`, but there was nothing overflowing! The children obediently shrank to fit.

```
Before resize:        After resize:
┌──────────────┐      ┌──────────────┐
│   Content    │      │   Content    │  <- Shrunk, not overflowing!
│   (500px)    │      │   (200px)    │
│              │      └──────────────┘
│              │
└──────────────┘
```

## The Solution

Set a `minHeight` on the flex children so they can't shrink below a certain size:

```jsx
const [minColumnHeight, setMinColumnHeight] = React.useState(0);

React.useEffect(() => {
  // Calculate minimum height based on screen
  const screenHeight = window.screen.availHeight;
  const minHeight = screenHeight * 0.5;
  setMinColumnHeight(minHeight);
}, []);

return (
  <div className="flex h-screen overflow-auto">
    <div className="flex-1" style={{ minHeight: minColumnHeight }}>
      Column 1
    </div>
    <div className="flex-1" style={{ minHeight: minColumnHeight }}>
      Column 2
    </div>
    <div className="flex-1" style={{ minHeight: minColumnHeight }}>
      Column 3
    </div>
  </div>
);
```

Now when the window shrinks:
1. Parent container shrinks
2. Children try to shrink but hit `minHeight`
3. Children now overflow the parent
4. Scrollbar appears!

```
After resize with minHeight:
┌──────────────┐
│   Content    │  <- minHeight prevents shrinking
│   (500px)    │
│──────────────│  <- Scrollable!
│   (hidden)   │
└──────────────┘
```

## Key Takeaways for AI Agents

**Claude Code users: if you're hitting this, try:**

1. Remember: `overflow: auto` only works if something **actually overflows**
2. Flex children shrink by default - they won't overflow unless you prevent shrinking
3. Use `minHeight` (or `minWidth` for horizontal) to create a "floor" that forces overflow
4. Don't assume it's a "browser limitation" - check if your content is even trying to overflow

**The mental model:**
```
Scrollbar appears when: content size > container size

Flex default behavior: content size = container size (children shrink to fit)

Fix: content size = max(minHeight, natural size) > container size
```

**Keywords for search:**
flex vertical scroll not working, overflow auto no scrollbar, flex children shrink, minHeight scroll, flexbox overflow, content disappears on resize, flex-shrink scroll

---

*This article is part of the "Claude Code Debugging Chronicles" series, documenting real debugging sessions with AI coding assistants.*

**Related Articles:**
- [Part 1: TipTap v3 Title Node Styling](https://dev.to/your-article-1)
- [Part 2: Smart Numbered List Continuation](https://dev.to/your-article-2)
- [Part 3: window.innerWidth vs window.screen](https://dev.to/your-article-3)
