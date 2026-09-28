# 認証･永続保存の準備

更新日: 2026-09-28.

## 現状

- 既存Firebaseプロジェクト `drafta-memo` にWebアプリ `Drafta Web` を登録しました. アプリIDは `1:642102711632:web:e1e1f3a8ba7d00eec00855` で, 登録状態はACTIVEです.
- SDK接続設定を取得しました. APIキーを文書･公開Repositoryへ記載していません. アプリ登録だけではログイン･保存･同期は動作しません.
- 承認後にFirestore APIを有効化し, 本番の(default) DBをasia-northeast1 (東京)へ作成しました. STANDARD･FIRESTORE_NATIVE･freeTier=true･誤削除防止有効･PITR無効をCLIで確認しました. 所有者別ルールの本番公開も成功しました. HostingのDeployと課金設定変更は行っていません.
- Firebase AuthenticationのGoogleプロバイダーを有効化しました. 公開名Draftaと承認済みのサポートメールを登録し, コンソールの「Google: 有効」を確認しました. メールアドレスは公開Repositoryへ転記していません. 実際のアプリでの本番ログイン･保存はまだ未検証です.
- Firebase SDK 12.19.0とRules検証用5.0.2をExact-versionで追加しました. `NEXT_PUBLIC_FIREBASE_MODE=emulator`を指定したローカル開発環境のみ画面から接続します. 未指定の公開版は従来のプレビューのままです.
- 本番接続用のコードを追加しました. `NEXT_PUBLIC_FIREBASE_MODE=production`と`NEXT_PUBLIC_FIREBASE_PROJECT_ID`･`NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`･`NEXT_PUBLIC_FIREBASE_APP_ID`･`NEXT_PUBLIC_FIREBASE_API_KEY`の全設定を明示した場合のみ接続します. 登録済みDraftaアプリと異なる設定を拒否し, Emulatorとは別インスタンスにします. 実際の本番モード起動とHostingのDeployは未実施です.
- Authenticationの承認済みドメインにはlocalhost･標準Firebaseドメイン2件があります. 独自ドメインdrafta-memo.comは未登録で, OAuth許可リストへの追加確認待ちです.
- ローカルのAuthentication･Firestoreエミュレーターで, 所有者分離等の4テストが成功しました. 実際のGoogleログインや本番での保存成功を意味しません.

## ローカル検証

`Drafta_Web`でJava 21以降とFirebase CLIを利用します. 今回のJavaはRepository外の作業用ランタイムで, PC共通のPATHやJAVA_HOMEは変更していません. 各端末でJavaの所在を確認し, 必要な場合はそのプロセスのPATHへ追加してください.

```powershell
npm run emulators
# または, テスト後に自動終了する場合:
npm run test:rules
```

- 常に `--project demo-drafta --config firebase.emulators.json` を明示します. 本番の `.firebaserc` は変更しません.
- localhostの9099 (Auth)と8080 (Firestore)を使います. 本番用Hosting設定とは別ファイルです.
- ルールテストは使い捨てのローカルデータを対象とします. 通常の `npm test` ではエミュレーター未起動時にこの4件はスキップされます. ルール検証には `npm run test:rules` の成功が必要です.
- テスト時のデータは各ケース前に消去されます. 実データをエミュレーターへ持ち込まないでください. 通常起動の停止時も自動永続化はしません.

## 保存層へ接続する設計案

- 最初は `/users/{uid}/workspaces/default` とその配下の `notes/{noteId}` を使い, ユーザーごとに分離します. 複数プロファイルUIは後続です.
- Workspaceにはスキーマ版･改訂番号･設定や順序を含むmetadataJson･更新時刻, Memoにはスキーマ版･文書JSONを含むpayloadJson･更新時刻を保存する案です. 意図しない大きなDocumentを拒否する上限は実装上の制約であり, Free/Proの容量設定ではありません.
- ルールは本人以外･未ログインを拒否し, 課金情報･未知のフィールドや保存先へのClient書き込みも拒否します.
- 現段階のルールは外側の型･サイズ･所有者を検査します. JSON内部の内容･参照整合性は別途検証が必要です. これだけで安全な保存機能が完成したとは扱いません.
- 改訂番号を使った保存競合の検出, 変更したMemoとWorkspaceの一括保存, 読み込み時の内容検証とアプリ状態への変換を実装しました. 画面への接続は未完です.
- `npm run test:storage`で保存層の5テストが成功しました. 別Clientからの再取得, 設定･Tray･Memo本文と順序, Memo削除, 古い改訂の書き込み拒否, アカウント分離, 壊れた保存データの拒否を確認しました.
- `npx vitest run src/lib/workspace-state.test.ts`の14テストで, 11言語の文書･設定の往復, 空のWorkspace, タイトル色, 本文プレビュー, 不正な参照の拒否を確認しました. 再ログイン後の画面復元はまだ未検証です.

## ローカル画面への接続

- 採用した1案に従い, ヘッダーに保存状態とアカウントメニューを配置しました. 表示と確認メッセージは11言語です. 小画面では状態アイコンとメニュー内の文言を使います.
- 認証状態確定後に所有者のWorkspaceを読み込みます. 読込失敗を空データとして扱いません. 初回のみプレビューのデータを引き継ぎ, 既存データがあるアカウントへ入る前は置き換えを確認します.
- 0.8秒の自動保存, 保存中の追加入力の直列化, 最大3回の再試行, 手動再試行, 競合時の停止と確認付き再読込を実装しました. blur･focusout･visibilitychange･Ctrl/Cmd+Sでも保存します. Memo･Trayの構造変更や設定変更は即時保存します. 空の保存処理と直後の入力が重なった場合も処理が止まらないことを回帰テストで確認しました.
- Firestoreはメモリキャッシュだけを使用します. 認証の保持方式は初期化からlocalStorageへ統一し, 別タブを開いた際の意図しないログアウトを防ぎます. Googleの実サービスではなく認証エミュレーターによる検証です.
- 画面検証はlocalhost:9002の1440px/375pxで実施しました. ログイン, Memo作成･本文編集, 再読み込み, ログアウト時の非表示, 再ログイン, 2タブの競合拒否･確認付き再読込, 通信断と復帰後の保存, テーマ･追加位置の復元が成功しました. 実行時エラーは検出されませんでした.
- 接続先境界8件, 保存キュー6件, 保存タイミング2件, 11言語の必須項目11件の対象テストと型チェック･対象Lintが成功しました. ローカルの別アカウントへの切替では元のMemoを表示せず, 別のMemoを保存できることも確認しました. 11言語のアカウントメニューは320px幅で表示･展開･画面外へのはみ出しがないことを確認しました. 本番Google OAuthは未検証です.

## 次の作業

本番接続用のアプリ設定と認証ドメインを確認し, 実際のGoogleログイン･保存を検証します. 本番DBとGoogleプロバイダーの設定は承認後に完了しましたが, アプリはまだローカル専用の接続です. 公開番号は0.1.1のままで, 未公開機能を公開済みとする履歴は追加しません. 本番で提供可能になるリリースで番号･11言語の更新履歴･Landing-pageを更新します. HostingのDeployは別途承認を得ます.
