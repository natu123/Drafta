# Drafta

<div align="center">

**Where raw thoughts become brilliant ideas.**

Drafta brings quick capture, to-dos, and structured writing together in one Memo.

</div>

**Live:** [drafta-memo.com](https://drafta-memo.com) · **Version:** 0.5.1

---

## ✨ Features

- **Draft First Philosophy**: Capture a Memo in the selected Tray. Each Memo has a completion checkbox in the list and an editable body with its own checklists.
- **Dual-Mode Editor**:
  - **Rich Text**: TipTap editor with headings, lists, checklists, tables, code blocks, and a 7-color text palette.
  - **Plain Text (Markdown)**: Switch to Markdown, including Drafta-MD color tags (`{color:#HEX}text{/color}`) and ordered-list markers (`{ol:N}...{/ol}`).
- **Smart Formatting**:
  - Markdown input shortcuts and a `/` block insertion menu in Rich mode.
  - Editable Welcome and Quick Reference guides: rename, change their icons, or delete them like other Memos.
- **Organization**:
  - **Trays**: Create, rename, manually reorder, pin, delete, and restore Trays. Inbox starts pinned and can also be renamed, moved, or deleted.
  - **Memos**: Move between Trays, reorder manually, and pin favorites. New Memos are added at the top by default, with an option to add at the bottom.
  - **Restore**: Recover deleted Memos and Trays before permanent deletion.
- **Modern UI**:
  - **Home and Writing Views**: Tray / Memo list / Editor panes on desktop; writing view offers hover-expandable vertical tabs for open Memos on non-mobile layouts.
  - **Responsive Layout**: Adaptive navigation on tablets and phones.
  - **Search and Themes**: Workspace search, search within a Memo, and light/dark themes.
  - **11 Languages**: English, Japanese, Simplified Chinese, Korean, Hindi, Arabic, Russian, Indonesian, Spanish, French, and Brazilian Portuguese. Starter Memos follow the display language until their title or body is edited.
- **Cloud Workspace**:
  - **Google Login Required**: Signed-out users see a login screen, without an editable preview.
  - **Autosave and Sync**: Memos, Trays, and settings are saved to Cloud Firestore and synchronized across devices signed in to the same account.
  - **Conflict Recovery**: Edits to different Memos can merge; conflicting edits to the same Memo are kept as a conflict copy. Structural conflicts can require confirmation.
  - **Saved History**: Keep up to 20 versions per Memo and restore a selected version as a new Memo. The original is not overwritten.

History normally captures the previous version on a change at least five minutes
after the last capture, with priority for deletion or clearing the body. It does not
record every edit. Permanent Memo deletion also removes its history.

If authentication is lost, unsaved edits are held in the current page for the original
account and reconciled after that account signs in again. Closing the page can lose
those pending edits. Durable offline editing is not implemented.

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router and static export), React 19
- **Runtime**: Node.js 24.x and npm 12.x (baseline: Node.js 24.21.0 / npm 12.0.2)
- **Language**: TypeScript
- **Editor**: [TipTap 3](https://tiptap.dev/) (ProseMirror)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/), shadcn/ui, and [Radix UI](https://www.radix-ui.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Authentication / Storage**: Firebase Authentication (Google) and Cloud Firestore
- **Hosting**: Firebase Hosting (`out/` static export)

Exact dependency versions and scripts are defined in [package.json](package.json).

## 🚀 Getting Started

1. **Clone the repository**

   ```powershell
   git clone https://github.com/natu123/Drafta.git
   cd Drafta/Drafta_Web
   ```

2. **Install dependencies** with Node.js 24.x and npm 12.x:

   ```powershell
   npm ci
   ```

3. **Start local authentication and storage**. Firebase CLI and Java 21 or later must be available:

   ```powershell
   npm run emulators
   ```

   This uses the `demo-drafta` project and [firebase.emulators.json](firebase.emulators.json),
   with Auth at `127.0.0.1:9099` and Firestore at `127.0.0.1:8080`.
   Data is not automatically persisted when the emulators stop.

4. **Run the development server** in a second terminal, from `Drafta_Web`:

   ```powershell
   $env:NEXT_PUBLIC_FIREBASE_MODE = "emulator"
   npm run dev
   ```

5. **Open the app** at [http://localhost:9002/app/](http://localhost:9002/app/) and use
   the local Auth emulator sign-in flow. The landing page is at `http://localhost:9002`.
   Emulator mode only accepts a local browser hostname (`localhost`, `127.0.0.1`, or `[::1]`).

With `NEXT_PUBLIC_FIREBASE_MODE` unset or `off`, Firebase is disabled and the login-required
workspace is unavailable. There is no in-memory editing preview.

### Production connection

Production mode requires these environment variables before starting the dev server
or building the static export:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_FIREBASE_MODE` | `production` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `drafta-memo` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `drafta-memo.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | `1:642102711632:web:e1e1f3a8ba7d00eec00855` |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Obtain from the registered Drafta Web app configuration; do not commit configuration values to the repository |

The current [Firebase client](src/lib/firebase-client.ts) validates the registered
Drafta project/app and approved hostnames. It does not accept an arbitrary Firebase
project by changing environment variables alone. Local emulator mode does not need
production credentials. Public Firebase variables are embedded at build time.

## ✅ Quality Checks

Run from `Drafta_Web`:

```powershell
npm run typecheck
npm run lint
npm test
```

Rules and storage integration tests are skipped by the regular test run unless the
Firestore emulator environment is available. To run them with automatic emulator
startup/shutdown, first stop any separately running emulators, then run sequentially:

```powershell
npm run test:rules
npm run test:storage
```

Use the dev server for routine development checks. The
[GitHub Actions workflow](../.github/workflows/quality.yml) runs typecheck, lint, unit
tests, and a static export build on pushes to `main` and pull requests; it does not
run the emulator integration suites.

## 🚀 Deploy

Stop the dev server, supply the [production connection](#production-connection)
variables, and run from `Drafta_Web` with authorized Firebase CLI access:

```powershell
npm run build
firebase deploy --only hosting --project drafta-memo
```

Firebase Hosting serves the generated `out/` directory. Build with the production
configuration before deploying: an unconfigured build cannot open the workspace.
This command deploys Hosting only; it does not update Firestore rules.

## 🗺️ Roadmap

Manual backup import/export UI, multiple profiles, external imports, MCP integration,
Memo sharing, paid plans, and native mobile apps remain planned. See the
[development plan](../specs/02_development_plan.md) for current status,
[sync and recovery](../specs/11_sync_recovery.md) for conflict behavior, and
[Memo history](../specs/12_memo_history.md) for version retention and restoration.

---

<div align="center">
  <sub>Built for the future of thinking.</sub>
</div>
