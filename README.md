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

Drafta is the notes layer of **YuniIn [Unifying-Informations]** — an open-source, browser-based unified workspace.

```
Browser (Chromium)
├── Drafta              ← notes & tasks  [this repo]
└── Chat UI (OSS)       ← messaging & collaboration
    ├── VS Code         ← code environment
    └── OpenHands       ← agentic AI
```

YuniIn's vision: notes, messaging, code, and AI — all in one browser, zero copy-pasting between silos. AI agents handle organization automatically; humans review and direct.

---

## License

MIT License — see [LICENSE](LICENSE)

---

## Author

**Gles** (Kenji Masuda) — natu.soral.123@gmail.com
