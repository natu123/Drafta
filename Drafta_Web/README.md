# Drafta

<div align="center">

**Where raw thoughts become brilliant ideas.**

Drafta is a modern, privacy-focused note-taking application designed to bridge the gap between quick capture and structured knowledge.

</div>

---

## ✨ Features

- **Draft First Philosophy**: Capture now, organize later. Every new note starts in your **Inbox**.
- **Dual-Mode Editor**:
  - **Rich Text**: Beautiful, distraction-free writing experience.
  - **Plain Text (Markdown)**: Full control over your formatting with GFM support.
- **Smart Formatting**:
  - Full Markdown support (Bold, Italic, Strikethrough, Lists, Tables, Code Blocks).
  - "Quick Reference" and "Welcome" guides built-in (Protected Notes).
- **Organization**:
  - **Trays (Groups)**: Drag and drop notes to organize them into custom trays.
  - **Tabs**: Keep multiple notes open and switch context instantly.
  - **Archive & Restore**: Delete items safely and restore them before permanent deletion.
- **Modern UI**:
  - **Dark/Light Mode**: Seamless theme switching.
  - **Responsive Layout**: Three panes on desktop, adaptive navigation on tablets and phones.
  - **Visual Cues**: Color-coded highlights (Rose/Green) for intuitive navigation.

## 🛠️ Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router and static export)
- **Runtime**: Node.js 24 and npm 11
- **Editor**: [Tiptap](https://tiptap.dev/) (Headless WYSIWYG)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) & [Radix UI](https://www.radix-ui.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **State**: React Hooks (in-memory UI state during Phase 1)
- **Hosting**: Firebase Hosting (`out/` static export)

> Notes currently reset after a page reload. Firebase persistence,
> authentication, and synchronization are planned for later phases.

## 🚀 Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/natu123/Drafta.git
   cd Drafta/Drafta_Web
   ```

2. **Install dependencies**
   ```bash
   npm ci
   ```

3. **Run the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to [http://localhost:9002](http://localhost:9002)

## ✅ Quality Checks

```bash
npm run typecheck
npm run lint
npm run build
```

The same checks run in GitHub Actions for pushes to `main` and pull requests.

## 🚀 Deploy

```bash
npm run build
firebase deploy --only hosting
```

Firebase Hosting serves the generated `out/` directory. Running the build before
deployment is required so the deployed files match the current source.

---

<div align="center">
  <sub>Built for the future of thinking.</sub>
</div>
