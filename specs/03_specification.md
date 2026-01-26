# Drafta 仕様書

## プラン設計

| 項目 | Free | Pro ($3/月) |
|------|------|-------------|
| ストレージ | 500MB | 10GB |
| 広告 | あり | なし |
| デスクトップアプリ | ❌ | ✅ |
| 追加ストレージ | ❌ | +10GB/$1（月額） |

### 通貨設定
- 基準: $3 USD/月
- 他通貨: Stripeによる自動換算

## 対応コンテンツ

| コンテンツ | 対応 | 備考 |
|-----------|------|------|
| テキスト | ✅ | TipTap JSON形式で保存 |
| 画像 | ✅ | 逐次ロード対応 |
| 動画 | ⚠️ | サムネイル表示のみ（保存不可） |
| 音声 | ❌ | 非対応 |

## 認証

| プロバイダー | Web | iOS | Android | Desktop |
|-------------|-----|-----|---------|---------|
| Google Sign-In | ✅ | ✅ | ✅ | ✅ |
| Apple Sign-In | ✅ | ✅ | ✅ | ✅ |

- メール/パスワード認証: なし
- Firebase Authenticationのアカウントリンク機能を使用

## 同期設計

### 基本方針
- **クラウドオンリー**（オフライン非対応）
- インターネット接続必須

### デバウンス
- **0.5秒（固定）**
- 楽観的UI更新（ローカルは即時反映、バックグラウンドで保存）

### リアルタイム同期
- Firestoreリアルタイムリスナー使用
- 変更されたドキュメントのみ受信（自動差分同期）

## データ設計（Firestore）

### ユーザー
```
/users/{userId}
  - email: string
  - plan: "free" | "pro"
  - storageUsed: number (bytes)
  - storageLimit: number (bytes)
  - createdAt: timestamp
  - updatedAt: timestamp
```

### メモ
```
/users/{userId}/notes/{noteId}
  - title: string
  - content: string (TipTap JSON)
  - createdAt: timestamp
  - updatedAt: timestamp
```

### 画像
```
/users/{userId}/notes/{noteId}/images/{imageId}
  - url: string (Firebase Storage URL)
  - size: number (bytes)
  - createdAt: timestamp
```

## ストレージ制限

### 制限到達時の挙動
1. 新規画像アップロード不可
2. 既存メモの編集は可能（テキストのみ）
3. アップグレード促進UI表示

### ストレージ計算
- テキスト: contentフィールドのバイト数
- 画像: Firebase Storageの実サイズ

## 広告配置

| プラットフォーム | サービス | 形式 | 位置 |
|-----------------|---------|------|------|
| Web | AdSense | バナー | 要検討 |
| iOS / Android | AdMob | バナー | 要検討 |

- インタースティシャル広告: **使用しない**（UX優先）

## 法務ドキュメント

### 作成タイミング
- ストア申請前（Phase 3-4）

### 必要書類
1. 利用規約
2. プライバシーポリシー

## ページネーション

### メモ一覧
- 20件ずつ取得
- updatedAtでソート（新しい順）
- 無限スクロールで追加読み込み

### 画像
- 逐次ロード（viewport内のみ読み込み）

## 将来的な検討事項

- オフライン対応（Firestoreのオフライン永続化）
- アダプティブデバウンス（アクティブ/非アクティブで切り替え）
- 追加認証プロバイダー
