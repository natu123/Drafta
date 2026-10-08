# Drafta

**Drafta** is an open-source note and task management app that unifies your to-dos and thoughts in one seamless editor.

> "Organize your to-dos and thoughts seamlessly."

**Live:** [drafta-memo.com](https://drafta-memo.com) · **Version:** 0.5.1

---

## Overview

Drafta is a web app built on TipTap — focused on a seamless writing experience with rich formatting and Drafta-MD syntax. A Memo combines a completion checkbox in the list with a rich body that can contain its own checklists. Trays organize those Memos.

### Core Features

- **Unified editor** — Rich (TipTap/ProseMirror) and Plain (Markdown) modes, with headings, lists, checklists, tables, code blocks, slash commands, and a 7-color text palette
- **Drafta-MD** — Extended Markdown syntax:
  - Color text: `{color:#HEX}text{/color}`
  - Ordered lists: `{ol:N}...{/ol}`
- **Tray organization** — Create Memos in the selected Tray; manually reorder, move, pin, delete, and restore items. Inbox is an ordinary Tray, pinned initially
- **Adaptive layout** — Tray / Memo list / Editor panes on desktop, focused navigation on tablets and phones, and a writing view with hover-expandable vertical tabs on non-mobile layouts
- **Search and appearance** — Workspace search, in-Memo search, and light/dark themes
- **11 languages** — Localized UI and starter Memos, including editable Welcome and Quick Reference guides
- **Google login and autosave** — Sign in to use the workspace; Memos, Trays, and settings are saved to Cloud Firestore and synchronized across devices using the same account
- **Memo history** — Up to 20 saved versions per Memo; restore a version as a separate Memo without overwriting the original

### Storage and recovery

Google login is required. The signed-out screen does not expose an editable preview.
Concurrent changes to different Memos can merge; conflicting edits to the same Memo
are preserved as a conflict copy, while structural conflicts can require confirmation.

History normally records a changed Memo's previous version when at least five minutes
have elapsed since the last capture; deletion and clearing the body take priority.
It is not a continuous record of every edit. Permanently deleting a Memo also removes
its history.

If authentication is lost, unsaved edits are held in the current page for the original
account and reconciled after that account signs in again. Recovery after closing the
page is not guaranteed; durable offline editing is not implemented.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, static export) + React 19 |
| Language | TypeScript |
| Editor | TipTap 3 (ProseMirror) |
| Styling | Tailwind CSS 4 + shadcn/ui |
| Authentication / Storage | Firebase Authentication (Google) / Cloud Firestore |
| Hosting | Firebase Hosting |

---

## Getting Started

Requirements: Node.js 24.x and npm 12.x (repository baseline: Node.js 24.21.0 and npm 12.0.2).
Local authentication and storage also require Firebase CLI and Java 21 or later.

```powershell
cd Drafta_Web
npm ci
npm run emulators
```

In a second terminal, from `Drafta_Web`:

```powershell
$env:NEXT_PUBLIC_FIREBASE_MODE = "emulator"
npm run dev
```

Open [http://localhost:9002/app/](http://localhost:9002/app/) and sign in using the
local Auth emulator. Emulator data is temporary and is not automatically persisted
when it stops. Without Firebase configuration, the workspace remains unavailable.

See the [web app README](Drafta_Web/README.md) for connection modes and production configuration.

### Quality checks

Run from `Drafta_Web`:

```powershell
npm run typecheck
npm run lint
npm test
```

Firestore rules and storage integration tests require the emulators. With separately
started emulators stopped, run:

```powershell
npm run test:rules
npm run test:storage
```

Use the dev server for routine development checks. The
[CI workflow](.github/workflows/quality.yml) also builds the static export.

### Deploy

From `Drafta_Web`, stop the dev server and supply the production Firebase environment
variables described in the [web app README](Drafta_Web/README.md#production-connection).
Then, with authorized Firebase CLI access:

```powershell
npm run build
firebase deploy --only hosting --project drafta-memo
```

Firebase Hosting serves `Drafta_Web/out/`. Hosting deployment does not deploy Firestore rules.

---

## Roadmap

Manual backup import/export UI, multiple profiles, external imports, MCP integration,
Memo sharing, paid plans, and native mobile apps are planned, not currently available.
The [development plan](specs/02_development_plan.md) tracks status and next steps.

## License

MIT License — see [LICENSE](LICENSE)
