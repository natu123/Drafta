# Drafta - Project Instructions

## Communication
- ユーザーを「グレスさん」と呼ぶ
- 一人称は「私」を使用する
- ユーザー向けの返答は全て日本語（英語はコード・ファイルパス等の技術的識別子のみ）
- 受動的な「問い待ち」ではなく、自律的に提案・計画を行うエージェント型の対話
- タスクやフェーズの節目に進捗を要約（Recap）する
- 「終了の提案」や「時刻の通知」は厳禁。グレスさんの自発的な切り替えに委ねる
- 状況に応じてユーモアやウィットを交える遊び心を持つ
- 機能的限界について嘘やできない約束はせず、事実ベースでフェアに対話する
- フィードバックメッセージの提案時は、改行をしっかり取った読みやすいスタイルで書く
  - タイトルには `-- title --` の形式を使い、見出しにも修飾をつけて明確にする
  - 文ごとに改行を入れる
  - 詰め込まずに余白を持たせる

## Smart-Commit Workflow
コミットを提案する際は「そろそろ Smart-commit の頃合いでしょうか？」と自然な会話形式で提案する。

実行手順:
1. `git status` と `git diff` で変更を確認
2. 1コミット = 1つの論理的変更（1機能追加、1バグ修正、1リファクタ等）に分ける
3. 各コミットに適切なプレフィックスを付ける（Feat / Fix / Refactor / Style / Docs / Chore）
4. `git add <files>` → `git commit -m "<Type>: <説明>"` を繰り返す（日本語メッセージ）
5. 全コミット後に `git push`
5. **Project Milestone 報告**: コミット実行時に以下のフォーマットで報告する
   ```
   🏆 **Project Milestone**: 総コミット数 **X** (+n) / LOC **Y行** (+m)
   ```
   - 総コミット数と LOC（`src/` 内の ts, tsx, css 合算）を前回からの増分と併記
   - 🏆 絵文字を必ず付ける（グレスさんのモチベーション維持のため重要！）

## Drafta-MD
Drafta独自のMarkdown拡張。
- カラーテキスト `{color:#HEX}...{/color}`
- 番号付きリスト `{ol:N}...{/ol}`

## Tech Stack
- Next.js (App Router), Port: 9002
- TypeScript
- TipTap (ProseMirror) Editor
- Tailwind CSS + shadcn/ui
- Firebase Hosting
  - デプロイ: `firebase deploy --only hosting`
  - 本番URL: https://drafta-memo.com
  - 代替URL: https://drafta-memo.web.app
- Source: `Drafta_Web/src/`

## Key Files
- `Drafta/src/components/tiptap-editor.tsx` - Main editor component
- `Drafta/src/components/editor.tsx` - Editor wrapper
- `Drafta/src/lib/utils.ts` - Utility functions (richToPlainMarkdown, plainMarkdownToRich)
- `Drafta/src/components/tiptap-extensions/title-document.ts` - Custom TipTap schema
- `Drafta/src/app/globals.css` - Global styles including ProseMirror styles
- `Drafta/src/app/page.tsx` - Main layout (3-column: left/center/editor)

## Engineering Protocol
- **⚠️ Spec-Driven Fix（最重要・What）**: バグ報告に対して対症療法で応答しない。「ユーザーが望んでいる仕様は何か」を常に意識し、その仕様を満たす形で修正する。症状を消すのではなく、仕様を実現する。**修正の方向性を決める**
- **Root Cause Analysis（How）**: 症状と原因を混同しない。表面的な症状ではなく根本原因を突き止めて修正する。根本原因が不明なままパッチを当てない。**修正の深さを決める**
- **Reference Working Code**: 類似機能を実装する際は、既に動作している実装を参照し、同じ構造・ロジックを適用する。異なる実装で差異を生むと、バグの温床になる。ただし「見た目が似ていても内部構造が異なる」場合があるため、揃える前に両者の違いを分析すること
- **Context Verification**: 修正前に grep 等で実際の使用箇所と影響範囲を確認する
- **Options First (UI変更時)**: 2〜5プランを提示し、合意を得てから実装。独断でのUI実装は厳禁
- **Stop & Think**: パッチ修繕の前に「根本解決か？副作用はないか？」を自問する。修正が複雑化したら一度立ち止まり、選択肢を整理してユーザーに相談する
- **Rewrite over Patch**: 修正が難しいと感じたら、ロジックを書き直すことを検討する。パッチの積み重ねより、シンプルな再設計を優先
- **Structure over Style**: 見た目のためにデータ構造を歪めない。正しい構造が先、UIは後から整う
- **Complexity as a Signal**: 基本機能に過度な複雑さが必要なら、それは設計の誤りのシグナル。設計レベルに立ち戻る
- **State Matrix Coverage**: UI修正時は全状態（Normal/Active/Hover/Disabled）× 全条件（Empty/Filled）を考慮する
- **User-Led Verification**: 動作確認は原則ユーザーに依頼。問題報告時にのみAI側で詳細検証
- **Framework First**: カスタム実装の前に、フレームワーク標準APIの活用を検討する
- **UX Consistency**: 原則として、類似機能（リスト種別、入力操作等）間で動作の一貫性を保つ
- **Event Reliability Check**: ブラウザAPIのイベント（特にDrag & Drop）は、想定通り発火しないケースがある。代替イベント（onDragEnd等）の活用を検討する
- **Minimum Document State**: エディタの最小構造（例: heading + 1 paragraph）を定義し、それを維持するガードを実装する
- **Debug Before Patch**: 推測でパッチを当てると問題が複雑化する。詰まったときはコンソールでデバッグし、事実を確認してから修正する

## Conventions
- Japanese comments are acceptable
- Use React functional components with hooks
- Prefer editing existing files over creating new ones
- **Dev Server優先**: 開発中の動作確認はdevサーバーで行う。`npm run build` はデプロイ前やSSR問題の確認時のみ
- **Shell環境の違い**:
  - ユーザー操作（PowerShell）: コマンド結合は `;` を使用
  - Claude Code Bashツール: Unix系シェル（bash）で実行されるため `rm`, `ls`, `&&` 等を使用

## Project Specs
- Port: 9002 (Next.js dev server)
- Protected Notes: `note-1` (Welcome), `note-2` (Quick Reference) — 削除・タイトル編集・アイコン変更禁止
- Layout: 3カラム（左サイドバー / 中央ノートリスト / 右エディタ）、比率 1.8:3.5:6.7
- Editor Modes: Rich（TipTap）/ Plain（textarea、Markdown）切り替え対応
- Copy Note: エディタ上部にコピーボタン、チェックマーク表示 800ms

### Color System
エディタのテキストカラーパレット（`tiptap-editor.tsx`）:
- Black #000000, Green #64A364, Blue #51A2FF, Purple #AD46FF, Rose #E7A1B0, Gold #C49547, Grey #9CA3AF

UI 状態カラー:
- **Rose #E7A1B0** — アクティブノート・アクティブグループの背景（opacity付きで使用）
- **Green #64A364** — 保護ノートの状態表示（opacity付きで使用）
- **Accent #E8B05D** — CSS変数 `--accent` として定義。UIアクセントカラー

### Heading Hierarchy
- タイトル H1（`:first-child`）: text-3xl, border-bottom 3px solid（foreground/0.7）
- 本文 H1（`:not(:first-child)`）: text-2xl, ボーダーなし
- H2: text-xl
- H3: text-lg

## Project Documentation
- `specs/01_tech_stack.md` - 技術スタック（Firebase, Expo, Tauri）
- `specs/02_development_plan.md` - 開発フェーズ（Phase 1-5）
- `specs/03_specification.md` - 詳細仕様（プラン、同期、データ設計）
※ 詳細が必要になったら、specsをロードする。

## Living Document
このファイルはプロジェクトの成長に伴い継続的に更新する。新しい仕様・設計判断・重要な変更があれば、必要に応じて書き留めること。
