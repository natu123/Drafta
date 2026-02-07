# Drafta Architecture Boundary

このファイルは、Drafta の責務境界（Boundary）を定義する初版ドキュメントです。  
目的は、機能追加時に実装の置き場所と依存方向を迷わない状態を作ることです。

## 1. 基本方針

- 境界は「機能」ではなく「責務」で分ける
- 依存は外側（UI/Platform）から内側（Core/Domain）へ一方向
- 仕様変更は先に `specs/` を更新し、その後実装する
- 共通化は「同じ理由で変わるもの」のみを対象にする

## 2. ドキュメント境界

- `specs/`: プロダクト仕様の正本（機能仕様・料金・挙動）
- `docs/`: 開発運用仕様（自動化ルール、設計ルール、手順）

ルール:
- 仕様の結論は `specs/` に記載する
- 運用ルールや手順は `docs/` に記載する
- 片方のみ更新して矛盾を作らない

## 3. アプリ境界（将来構成）

推奨構成:

```text
Drafta/
  apps/
    web/
    mobile/
    desktop/
  packages/
    editor-core/
    sync-core/
    billing-core/
    ui/
  specs/
  docs/
```

現状方針:
- 既存の `Drafta_Web` は当面維持する
- 移行タイミングで `apps/web` へ段階移動する

## 4. 責務定義

- `web/mobile/desktop`: 画面・入力・OS連携
- `editor-core`: TipTap拡張、Markdown変換、編集ドメイン
- `sync-core`: Firestore同期、保存状態、デバウンス制御
- `billing-core`: プラン判定、容量上限判定、追加容量計算
- `ui`: 共通UI部品とデザイントークン

禁止事項:
- UI層から直接Firestore操作ロジックを分散実装しない
- プラットフォーム固有処理をCoreに持ち込まない
- 料金/容量判定ロジックを複数箇所に重複実装しない

## 5. 依存ルール

依存方向:

`apps/* -> packages/ui -> packages/*-core`

補足:
- `editor-core` は `sync-core` に依存しない
- `billing-core` は UI に依存しない
- `sync-core` は UI に依存しない

## 6. 変更手順（実務）

1. 変更対象の責務を先に判定する
2. `specs/` の該当仕様を更新する
3. 実装を1責務ずつ反映する
4. 影響範囲を `rg` で確認する
5. Smart-Commit（1変更=1コミット）で確定する

## 7. 境界逸脱のチェック項目

- そのロジックは別プラットフォームでも使うか
- その変更理由はUI都合か、ドメイン都合か
- 同じ判定を別ファイルで再実装していないか
- 仕様（`specs/`）と実装が乖離していないか

---

初版作成日: 2026-02-07
