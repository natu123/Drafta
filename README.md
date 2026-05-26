# Drafta

**Drafta** is an open-source note and task management app that unifies your to-dos and thoughts in one seamless editor.

> "Organize your to-dos and thoughts seamlessly."

**Live:** [drafta-memo.com](https://drafta-memo.com)

---

## Overview

Drafta is the notes layer of **Project YuniIn** — a vision for a unified, browser-based workspace where notes, AI agents, code environments, and communication coexist.

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

## Project YuniIn

Drafta is being developed as a component of **YuniIn [Unifying-Informations]** — an open-source, browser-based unified workspace integrating:

- **Drafta** — Notes and tasks
- **OpenHands** — Agentic AI
- **VS Code** — Code environment
- **Chromium** — Browser runtime

YuniIn's vision: everything you need — notes, AI, code, and communication — in one place, with no manual copy-pasting between silos.

---

## License

MIT License — see [LICENSE](LICENSE)

---

## Author

**Gles** (Kenji Masuda) — [@____natu______](https://x.com/____natu______)
