# Drafta

**Drafta** is an open-source note and task management app that unifies your to-dos and thoughts in one seamless editor.

> "Organize your to-dos and thoughts seamlessly."

**Live:** [drafta-memo.com](https://drafta-memo.com)

---

## Overview

Drafta is a standalone note and task app built on TipTap — focused on a seamless writing experience with rich formatting and Drafta-MD syntax.

### Core Features

- **Unified editor** — Rich (TipTap/ProseMirror) and Plain (Markdown) modes, switchable per note
- **Drafta-MD** — Extended Markdown syntax:
  - Color text: `{color:#HEX}text{/color}`
  - Ordered lists: `{ol:N}...{/ol}`
- **3-column layout** — Sidebar / Note list / Editor (ratio 1.8 : 3.5 : 6.7)
- **Color palette** — 7-color text formatting in the editor
- **Note groups** — Organize notes into collapsible groups

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js (App Router) |
| Language | TypeScript |
| Editor | TipTap (ProseMirror) |
| Styling | Tailwind CSS + shadcn/ui |
| Hosting | Firebase Hosting |

---

## Getting Started

```bash
cd Drafta_Web
npm install
npm run dev
# → http://localhost:9002
```

### Deploy

```bash
firebase deploy --only hosting
```

---

## License

MIT License — see [LICENSE](LICENSE)


