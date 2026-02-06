---
title: Claude Code Stuck on Minimum Window Size: You Can't Control Browser Window Size from Web Apps
tags: claudecode, javascript, responsive, browser
---

## The Problem

I wanted to prevent users from shrinking the browser window below 50% of their screen size. Seemed like a reasonable UX constraint.

```javascript
// My naive attempts
window.minWidth = 800;  // Doesn't exist
window.resizeTo(800, 600);  // Security blocked
```

**Expected:** Window can't shrink below 50% of screen.

**Actual:** Nothing works. Browser ignores all attempts.

## Why Claude Code Got Stuck

Claude Code went down a rabbit hole trying different APIs:

1. First tried `window.innerWidth` calculations (wrong API for the goal)
2. Then tried `window.screen.availWidth` (better API, but still can't control window)
3. Explored CSS `min-width: 50vw` on body (doesn't constrain window)
4. Considered `window.resizeTo()` (blocked by browsers for security)

The fundamental assumption was wrong: **"There must be a way to control window size from JavaScript."**

## Root Cause Analysis

**Browser security model prevents web apps from controlling window size.**

This is intentional:
- Prevents malicious sites from making unclosable windows
- Stops phishing sites from mimicking OS dialogs
- Protects user control over their own browser

The only exception: `window.resizeTo()` works for windows that **your script opened** via `window.open()`. But for the main browser window? No way.

```javascript
// This is blocked by browsers
window.resizeTo(800, 600);  // SecurityError or silently ignored

// Only works for popup windows YOU created
const popup = window.open('', '', 'width=400,height=300');
popup.resizeTo(500, 400);  // This works
```

## The Solution

**Accept the limitation. Change your approach.**

Instead of controlling window size, **control your content's minimum size** and let the browser add scrollbars:

```jsx
const [minWidth, setMinWidth] = React.useState(0);
const [minHeight, setMinHeight] = React.useState(0);

React.useEffect(() => {
  // Calculate minimum content size based on screen
  const screenWidth = window.screen.availWidth;
  const screenHeight = window.screen.availHeight;

  setMinWidth(screenWidth * 0.5);
  setMinHeight(screenHeight * 0.5);
}, []);

return (
  <div className="overflow-auto" style={{ minWidth, minHeight }}>
    {/* Your app content */}
  </div>
);
```

**The mindset shift:**
- ❌ "Prevent window from shrinking" → Impossible
- ✅ "Content has minimum size, scrollbar appears if window is too small" → Works!

## Key Takeaways for AI Agents

**Claude Code users: if you're hitting this, try:**

1. **Accept browser security limits** - You cannot control main window size from a web app
2. **Reframe the problem** - "minimum window size" → "minimum content size with scrollbars"
3. **Use `minWidth`/`minHeight` on content** + `overflow: auto` on container
4. **Use `window.screen.availWidth/Height`** to calculate screen-relative minimums (not `innerWidth` which changes with window size)

**The pattern:**
```jsx
// Container: allows scrolling
<div style={{ overflow: 'auto' }}>

  // Content: has minimum size, forces scrollbar when needed
  <div style={{ minWidth: calculatedMin, minHeight: calculatedMin }}>
    ...
  </div>
</div>
```

**Keywords for search:**
minimum window size javascript, prevent browser resize, window.resizeTo not working, control browser window size, min-width viewport, scroll instead of shrink, browser security window resize

---

*This article is part of the "Claude Code Debugging Chronicles" series, documenting real debugging sessions with AI coding assistants.*

**Related Articles:**
- [Part 1: TipTap v3 Title Node Styling](https://dev.to/your-article-1)
- [Part 2: Smart Numbered List Continuation](https://dev.to/your-article-2)
