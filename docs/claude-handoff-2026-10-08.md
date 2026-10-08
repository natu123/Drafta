# Claude引き継ぎ資料

最終確認: 2026-10-08. この文書は作業開始時の要約です. 最新のコード・公開状態・ユーザー指示を確認してから変更してください.

## 現状

- Repository: `C:\Users\kenji\Drafta` (`main`). 公開先: `https://drafta-memo.com/`. Webアプリ: `https://drafta-memo.com/app/`.
- 2026-09-30にVersion 0.5.1を公開しました. Firebase Hostingと本番更新履歴へ反映済みです. 2026-10-08に計画文書の現行化と改行規則 (`.gitattributes`) の追加を行いました. 最新のCommitは`git log`で確認してください.
- Googleログインが必須です. 未ログインでは編集画面を表示しません. Googleポップアップを閉じた場合はエラーを表示せず, ブロック時は許可方法を, その他の認証失敗は再試行を案内します. 画面にFirebaseの内部コードを表示しません.
- Memo・Tray・設定はFirebase/Firestoreへ保存し, 同一アカウントで端末間同期します. 同じMemoの競合では原文と競合コピーを保持します. Tray・順序・削除等の構造競合は自動上書きせず, 確認を求めます.
- 未保存編集は認証が切れてもページが開いている間は元アカウント専用に保留します. 同じアカウントで再ログインするとサーバー版と照合して復旧します. 別アカウントへ編集内容は渡しません. ページ再読み込み・終了後の未保存編集復元とオフライン編集の永続保管は未対応です.
- Googleログイン後のMemoに保存履歴があります. 通常5分間隔で最大20版を保ち, 削除・本文全消去前の版を優先します. 履歴は本人のみ閲覧でき, 選択した版を元Memoと別のMemoへ復元します. 履歴用Firestoreルールは本番反映済みです.
- 公開版は0.5.1です. 技術構成はNext.js App Router, TypeScript, TipTap/ProseMirror, Tailwind CSS, shadcn/ui, Firebase Hosting/Firestoreです. 11言語に対応します.

## 情報源の優先順位

1. `AGENTS.md`がProject指示の正本です. Deploy承認・テスト粒度・Commit/Push等も最初に確認してください.
2. `CLAUDE.md`はClaude Code向け補助指示で, Project仕様の複製元ではありません.
3. `Drafta_Web/package.json`が公開Versionの正本です. 更新履歴は`Drafta_Web/src/lib/release-info.ts`と同`release-copy.ts`から生成されます.
4. `specs/12_memo_history.md`と`specs/13_login_required.md`は各機能の採用仕様と検証結果です. 同期・保存の補足は`specs/10_persistence_foundation.md`と`specs/11_sync_recovery.md`を参照してください.
5. `README.md`と`Drafta_Web/README.md`は`5570025`で認証・保存・ローカル開発手順の現状に更新済みです. ローカル動作確認にはFirebase Emulatorを使い, `NEXT_PUBLIC_FIREBASE_MODE=emulator`を設定します.
6. `specs/02_development_plan.md`は2026-10-08に0.5.1へ更新済みで, 現状・今後の方針・次の作業の正本です.
7. `specs/05_service_launch_plan.md`は0章が現在の状態, 1章が2026-09-15の初回監査記録です. `specs/03_specification.md`は初期設計の記録で, 冒頭に現行との差分を記載しています.

## 次の作業

開発計画と正式サービス化計画は2026-10-08に0.5.1へ更新済みです. 次は, 保存履歴と認証喪失時の復旧を実利用で確認し, 障害時に利用者が取る手順を整えるのが既定の次段階です. 本番ユーザーのデータを使う検証は避け, テスト用Memoを使ってください. 失敗を誘発する認証失効や削除を本番アカウントへ行う前に, 内容と影響を示してGlesさんへ確認してください.

広告なしの無料βを目指します. プロファイル作成/削除とフィードバックフォームは未着手です. 手動バックアップUIは後続へ移しています. Notion/Obsidian/Evernoteのインポート, Codex MCP, Memo共有, iOS/Androidネイティブアプリも後続候補で, 無料β開始の必須条件ではありません. 有料プラン・容量・料金・課金開始日は未確定です.

## 作業の入口

```powershell
Set-Location C:\Users\kenji\Drafta\Drafta_Web
npm ci
npm run emulators
```

2つ目のTerminalから:

```powershell
Set-Location C:\Users\kenji\Drafta\Drafta_Web
$env:NEXT_PUBLIC_FIREBASE_MODE = "emulator"
npm run dev
```

開発サーバーは`http://localhost:9002/app/`です. Node.js 24.x, npm 12.x, Firebase CLIとJava 21以降が必要です. Emulatorは`demo-drafta`を使い, Authは9099, Firestoreは8080です. Emulatorを停止してもデータは自動保存されません. 主なコマンドは`npm test`, `npm run typecheck`, `npm run lint`, `npm run test:rules`, `npm run test:storage`です. 変更範囲に合う確認だけ実行し, 小変更で全テストを一律に繰り返さないでください.

本番接続Buildには登録済みFirebase Webアプリの接続設定が必要です. Secretや設定値をGit・文書・ログへ書かないでください. Firebase設定ファイルは`Drafta_Web/`内です. 本番Deploy前にはHosting対象と生成物を確認します. 通常のアプリ更新は`AGENTS.md`の継続許可に従います. 課金・認証方式・Firestoreアクセスルール・本番データ削除/移行は別途承認が必要です. 文書だけの変更はDeployしません.

## 作業中の約束

- 始めに`git status`と直近のCommitを確認し, ユーザーの変更を上書きしません.
- 画面変更は該当画面と影響する幅を確認します. Firebaseの所有者分離やSchemaを変える場合は対応テストと影響範囲を広げて確認します.
- 利用者に影響するReleaseではPackage/Lock, 更新履歴, 11言語のLanding-pageとリリース情報を揃えます. 本番Deploy後は公開環境を検証します.
- ユーザーへ節目を「現状 → 今後の方針 → 次の作業」の順で伝え, ローカル検証・本番反映・未検証を区別します.
