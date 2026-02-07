# Drafta - AGENTS Instructions

## Source Of Truth
- このファイルをプロジェクト指示の正本（single source of truth）とする
- 自動化コマンド/Skillの共通仕様は docs/automation-spec.md を正本とする
- ルール変更はまず AGENTS.md を更新し、必要な差分のみ CLAUDE.md に反映する

## Communication
- ユーザーを「グレスさん」と呼ぶ
- 一人称は「私」を使用する
- 返答は常に敬語（です・ます調）で統一し、断定的な常体（だ・である調）は使わない
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
キリの良いタイミングでコミットを自然に提案する。
**原則: 1変更 = 1コミット**

### 命名規則（履歴可読性の向上）
- 2つ以上のコミットを切る場合、件名の「対象」と「目的」が重複しないようにする
- 形式: `<Type>: <対象>を<目的>（必要なら手段）`
  - 例1: `Fix: note-2初期データのOL構造を正規化`
  - 例2: `Fix: Plain変換でOL継続行の改行保持を修正`
  - 例3: `Refactor: removeFormattingのテーブル抽出処理を再設計`
- 「変換改善」「不具合修正」など抽象語だけの件名を禁止する
- 同一PR内で同名コミットを作らない（最低でも対象語を変える）

### コミット本文ルール（箇条書き必須）
- `git commit -m "<件名>" -m "<本文>"` を使用し、本文を必ず付与する
- 本文テンプレート:
  - `- 背景: なぜこの変更が必要か`
  - `- 変更: 何をどう変えたか（主要ファイル）`
  - `- 影響: 互換性/副作用/確認観点`
- 1コミットで3〜6行程度を目安に簡潔に書く

実行手順:
1. `git status` と `git diff` で変更を確認
2. 各コミットに適切なプレフィックスを付ける（Feat / Fix / Refactor / Style / Docs / Chore）
3. コミット単位ごとに「対象」と「目的」が一意な件名を作る
4. `git add <files>` → `git commit -m "<Type>: <説明>" -m "<箇条書き本文>"` を繰り返す（日本語メッセージ）
   - 逐次実行のみ。`git commit` の並列実行は禁止（`index.lock`競合防止）
5. 全コミット後に `git push`
6. **Project Milestone 報告**: コミット実行時に以下のフォーマットで報告する
   ```
   🏆 **Project Milestone**: 総コミット数 **X** (+n) / LOC **Y行** (+m)
   ```
   - 総コミット数: `git rev-list --count HEAD`
   - LOC: `git ls-files | grep -v "package-lock.json" | xargs wc -l`
     - git追跡ファイル全体をカウント（拡張子不問）
     - `package-lock.json` は自動生成ファイルのため除外
   - 前回からの増分を併記
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
  - 本番URL: https://drafta-memo.com （デプロイ後はこちらを提示）
  - 代替URL: https://drafta-memo.web.app
- Source: `Drafta_Web/src/`

## Key Files
- `Drafta_Web/src/components/tiptap-editor.tsx` - Main editor component
- `Drafta_Web/src/components/editor.tsx` - Editor wrapper
- `Drafta_Web/src/lib/utils.ts` - Utility functions (richToPlainMarkdown, plainMarkdownToRich)
- `Drafta_Web/src/components/tiptap-extensions/title-document.ts` - Custom TipTap schema
- `Drafta_Web/src/app/globals.css` - Global styles including ProseMirror styles
- `Drafta_Web/src/app/page.tsx` - Main layout (3-column: left/center/editor)

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
- **Feature Removal Cleanup**: 機能を廃止する際は、関連するキーワード（変数名、マジックナンバー、CSSクラス等）を grep で網羅的に検索し、残存コードを一括削除する。部分的な削除は新たなバグの原因となる

## Conventions
- Japanese comments are acceptable
- Use React functional components with hooks
- Prefer editing existing files over creating new ones
- **Dev Server優先**: 開発中の動作確認はdevサーバーで行う。TypeScript型エラーやビルドエラーもdevサーバーで検出されるため、実装後のエラーチェック目的で `npm run build` を実行しない。buildはデプロイ前やSSR問題の確認時のみ
- **Shell環境**:
  - 本プロジェクトでの実行環境は PowerShell。コマンド結合は `;` を使用
  - Unix系シェル向けコマンド（`rm`, `ls`, `&&`）の提案は、PowerShell構文に置き換えて提示する

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




