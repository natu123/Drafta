# Claude引き継ぎ (2026-10-21 夕方時点)

作業開始時は`AGENTS.md`を正本として読み, 最新のコード・Git・本番状態を改めて確認してください. 開発手順の基本 (Emulator・テスト) は`docs/claude-handoff-2026-10-08.md`と`README.md`, 公開手順と公開ごとの確認は`specs/09_release_versioning.md`を参照します.

## 公開状態

- 本番は **0.8.1** (2026-10-21公開, 記録Commit `cbbf279`). 作業ツリーに未Commitの変更はなく, すべてPush済みです (未追跡の`.claude/launch.json`は手元の起動設定で, Commitしません).
- 2026-10-20〜21に0.6.2から0.8.1まで公開しました. 各版の内容と確認は`specs/09`の「公開時の確認」, 計画と履歴は`specs/02`にあります.
- 主な到達点:
  - 0.7.0 端末キャッシュ (`specs/16`), 0.7.1 前回の表示の復元, 0.7.2 開いたメモだけの変換とすべてのメモ (All Memos), 0.7.3 Playground (`specs/18`).
  - 0.8.0 要約と本文の分離 (`specs/17`, AGENTS.mdのSummary Storage). 本番データはGlesさんが13:30に更新画面から移行済みで, 562メモ・12Trayの一致を閲覧のみで確認しました.
  - 0.8.1 新しい端末で本文がそろう前から編集できる (保留して, そろってから保存・統合).

## 様子見と予定

1. **0.8.0の新しい保存形式の様子見**: Glesさんに「保存済みにならない」「他端末に反映されない」「エラーが出る」症状がないか確認します.
2. **2026-10-24ごろ: Firestoreルールの締め直し**. 今は移行用に旧形式 (schemaVersion 1) の書き込みも許しています. 問題がなければ新形式だけを許すルールにします. **Firestoreルールの変更なので, 内容と影響を示して承認を得てから公開します.** 締め直すと旧形式へ戻す通り道 (`downgradeWorkspace`) はルールの再公開が必要になる点も伝えます. あわせて, 移行の画面・旧形式の読み込み (`cloud-workspace-legacy.ts`, `cloud-workspace-migration.ts`, `storage-migration.tsx`) を残すか消すかを決めます.

## 次の作業 (Glesさんの指定)

1. **スマートフォン向けデザインの最適化 (最優先, 2026-10-22に開始予定)**. 具体的な不満点はまだ聞いていません. 最初にGlesさんに困っている画面・操作を聞き, iPhoneのホーム画面アプリ (PWA) と375px幅のEmulatorで現状を確認してから進めます. 関係しそうな既知の点:
   - スマホでは状態表示の文字が隠れ, 本文の読み込み中の進み具合が見えない (アイコンだけ).
   - メモ一覧・トレイ・エディタは`mobilePane` (`trays`/`notes`/`editor`) で切り替える作り (`src/components/workspace-view.tsx`).
2. Notion・Evernoteからの取り込み (Obsidianの取り込みは`specs/14`).
3. 未着手の小さな候補: 戻す処理やJSONバックアップからの復元の画面がない, 全体の上限64MB (全本文をメモリーに持つため).

## 開発環境のメモ

- Emulator: `.claude/launch.json`の`emulators` (空), `emulators-v1` (0.7.3で作った旧形式のデータ: Vault 559メモ, 一時フォルダのscratchpad`v1-seed`を読み込み. Sessionが変わると消える可能性あり), `dev-emulator` (開発Server 9002).
- 本番Buildは環境変数だけで設定を渡します (`NEXT_PUBLIC_FIREBASE_MODE=production`を必ず含める). `firebase deploy --only hosting`の前に`scripts/check-production-build.mjs`が自動で走り, 本番設定のないBuildを止めます (0.7.2で設定を渡し忘れてログインできなくなった再発防止).
- 公開確認では, 本番のログインボタンでGoogleのログイン画面が開くことまで確かめます (ログインはしない).
- WindowsのBashで`node -e`の置換を使うと, 置換文字列の`$'`・`$&`が特殊記号として解釈されます (今回`firestore.rules`で発生し, Gitから戻しました). 多くのファイルはCRLFです. 置換はEditツールか, 改行と記号をそのまま扱う補助スクリプトで行います.
- 確認用のScreenshotにVaultの個人データが写る場合は共有しません.
- WIPのTag `wip/diff-subscription-0.6.2` はローカルに残っています (0.6.2で統合済み. 消してよいかは未確認).
