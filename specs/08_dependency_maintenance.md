# 依存関係のメンテナンス

確認日: 2026-09-17.

## 実行環境と更新方針

- Node.jsはCurrentではなく24系LTSを使用し、PCとCIの基準を24.21.0に揃えます。
- npmは12.0.2を使用します。packageManagerとCIで固定します。
- 直接依存は検証したバージョンを固定し、package-lock.jsonをコミットします。
- 一律の強制更新や`--legacy-peer-deps`による互換性検査の回避は行いません。
- npm 12のインストールスクリプト制限を維持します。現在unrs-resolverのpostinstallは未承認ですが、配布済みバイナリで検証します。必要が生じた場合だけ内容と影響を確認して個別承認します。

## 主な更新先

| 対象 | 更新後 |
|---|---|
| Next.js / eslint-config-next | 16.3.5 |
| React / React DOM | 19.3.0 |
| TipTap一式 | 3.31.3 |
| Tailwind CSS / PostCSS連携 | 4.3.3 |
| PostCSS | 8.5.28 |
| Vitest | 5.0.1 |
| jsdom | 30.1.0 |
| TypeScript CLI | 7.0.2 |
| TypeScript API互換パッケージ | 6.0.2 |
| Lucide React | 1.46.0 |
| next-themes | 0.4.6 |

その他の直接依存の正本は`Drafta_Web/package.json`です。

## 意図的な互換構成

### ESLint

ESLint 10.10.0は、Next.js 16.3.5が使用するeslint-plugin-react 7.37.5とeslint-plugin-import 2.32.0のpeer範囲外でした。実行時にも`contextOrFilename.getFilename is not a function`で停止しました。そのためESLintは9.39.5を維持します。

9系にはnpmのサポート終了警告が出ます。最新版と称して隠さず、対応プラグインが利用可能になった段階で10系を再検証します。現在の既知の脆弱性確認とサポート期間は別の観点として扱います。

### TypeScript

TypeScript 7のCLIと、Microsoftが公開した`@typescript/typescript6`をnpmエイリアスで併用します。`npm run typecheck`の`tsc`は7.0.2です。互換パッケージの版は6.0.2、内部APIと`tsc6`の報告版は6.0.3です。プレビュー版は使用しません。

### Node型定義

`@types/node`はnpmのlatestタグではなく、実行環境に対応する24系の最新版を選択します。

## CSSとブラウザー対応

承認済みの対応範囲はSafari 16.4以降、Chrome 111以降、Firefox 128以降です。これより古いブラウザーは保証対象外です。

既存テーマは`tailwind.config.mts`から読み込みます。影とフォーカス枠はv4の名前へ対応付け、旧版の見た目とアクセシビリティを維持します。設定は明示的なESMとして扱います。

## Next.jsの作業規約ファイル

Next.js 16の`next dev`はAI向けのAGENTS.md等を自動生成します。Draftaはリポジトリ直下のAGENTS.mdを正本とするため、`agentRules: false`で追加生成を無効化しています。Next.jsのバージョン別ドキュメントは別途参照します。

## 更新後に実行する確認

1. `npm ci`でクリーンインストールします。
2. `npm run typecheck`、`npm run lint`、`npm test`を実行します。
3. リリース前に`npm run build`で静的出力を作ります。
4. Rich/Plain往復、Markdown・スラッシュ入力、表、検索、ピン留め、並べ替え、多言語、テーマ、PC/SPの表示を確認します。
5. `npm audit`と`npm ls --all`で既知の脆弱性と依存整合を確認します。監査0件を未知の脆弱性がない保証とは扱いません。
6. 公開後は公開URLでも主要操作を再確認します。

## 公式資料

- https://nodejs.org/en/download
- https://nextjs.org/docs/app/guides/upgrading/version-16
- https://tailwindcss.com/docs/upgrade-guide
- https://vitest.dev/guide/migration/
- https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/#running-side-by-side-with-typescript-6.0
