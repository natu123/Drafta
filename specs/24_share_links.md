# 共有リンク (Pro) の設計の下書き

作成日: 2026-10-29. **下書き (未承認)** です.

[22_monetization_plan.md](22_monetization_plan.md)の「作る順番」の2段目です. メモを, ログインしていない人にも読める公開ページとして共有します. 作るのはPro (課金の基盤は[23_billing_foundation.md](23_billing_foundation.md)) の方だけで, 見るのは誰でもできます. Firestoreルールの変更と本番への公開は, 着手する段ごとに 内容・影響・リスクを示して明示承認を得ます (AGENTS.md).

## 1. Glesさんの選択 (2026-10-29)

| 決めごと | 選択 | 理由と影響 |
|---|---|---|
| 内容の反映 | **編集に自動で追従** | 共有中のメモは, 保存のたびに公開ページも新しくなります. 手間がない代わりに, 共有中のメモに書いたものは すべて公開されます. 共有中であることを, メモの画面に常に表示します (4章) |
| 入口 | **ツールバーのボタン** | メモのツールバーで, 履歴の隣に共有のアイコンを置きます. 押すと小さな画面が開きます (4章) |
| 共有ページ | **静的ページ** | 今と同じ静的なページが, Firestoreから公開用の写しを読んで表示します. サーバーの費用はほぼかかりません. SNSに貼ったときのプレビューは, メモのタイトルではなく Draftaの共通の表示です |

## 2. 仕組み

### 2.1 リンク

- 形: `https://drafta-memo.com/s/#<token>`. `token`は暗号論的な乱数で作る 22文字 (128bit, base64url) です. 推測で他人の共有にたどり着けない長さにします.
- tokenを `#` の後ろに置くので, ブラウザーはサーバーへ送らず, 他のサイトへのReferrerにも出ません. Hostingの書き換え (rewrite) も要りません.
- 共有をやめて また共有すると, 新しいtokenになります. 古いリンクは戻りません.

### 2.2 公開用の写し

メモの本体 (`users/{uid}/workspaces/default/bodies/{noteId}`) は, 今までどおり本人しか読めません. 公開する分だけを, 別の場所に写します.

`shares/{token}`:

| 項目 | 内容 |
|---|---|
| `schemaVersion` | 1 |
| `ownerUid` | 作った人. 変更できません |
| `noteId` | 元のメモ. 変更できません |
| `title` | メモのタイトル (ページのタイトルに使います) |
| `documentJson` | 本文 (TipTapのJSON. 本体と同じ形, 500,000文字未満) |
| `updatedAt` | サーバーの時刻 |
| `blocked` | 運営が非公開にしたとき `true`. 本人は変えられません |

本人の側は, メモの情報 (`metadataJson`の各メモ) に `shareToken` を持ち, どのメモが共有中かを知ります. 公開用の写しを一覧で探すことはしません (ルールで一覧の読み取りを禁じます).

### 2.3 自動の追従

- 共有中のメモの本文を保存したあと, 同じ内容で `shares/{token}` を更新します. 共有していないメモの保存は 今までと変わりません.
- 本文の保存を先に終え, 写しの更新はその後に続けます. 写しの更新が失敗しても, メモの保存は失敗にしません. 次の保存か, 共有の画面を開いたときに 写しを直します.
- 書き込みが増えるのは 共有中のメモだけで, 保存1回につき1回です. 速さを最優先にしている保存の流れ (1×/4×の最初の描画) には, 待ちを足しません.

### 2.4 Proの確認

- 作る・更新するとき: ルールが `users/{uid}/billing/subscription` の `plan == 'pro'` を確かめます.
- **見るとき**: ルールが, 持ち主の今のProの状態を毎回確かめます. 解約して無料に戻ると, 共有ページは自動で見られなくなり, 再加入すると同じリンクで戻ります. サーバーの処理は要りません. 写しは残し, 本人はいつでも共有をやめて写しを消せます. これは [22_monetization_plan.md](22_monetization_plan.md) の未決事項「解約したときの扱い」の案と同じ動きです.
- 支払失敗中 (`past_due`) は Proに含めるため (23の決定), その間も見られます.
- 閲覧1回につき, 写しと持ち主のProの状態で 2回の読み取りになります.

### 2.5 ルール (案)

```
match /shares/{token} {
  function ownerIsPro(uid) {
    return get(/databases/$(database)/documents/users/$(uid)/billing/subscription).data.plan == 'pro';
  }
  function validShare() {
    return request.resource.data.keys().hasOnly(['schemaVersion', 'ownerUid', 'noteId', 'title', 'documentJson', 'updatedAt', 'blocked'])
      && request.resource.data.schemaVersion == 1
      && request.resource.data.ownerUid == request.auth.uid
      && request.resource.data.noteId is string && request.resource.data.noteId.matches('^[A-Za-z0-9_-]{1,128}$')
      && request.resource.data.title is string && request.resource.data.title.size() <= 2000
      && request.resource.data.documentJson is string && request.resource.data.documentJson.size() < 500000
      && request.resource.data.updatedAt == request.time;
  }
  // 誰でも1件ずつ読めるが, 一覧はできない.
  allow get: if resource.data.blocked == false && ownerIsPro(resource.data.ownerUid);
  allow list: if false;
  allow create: if request.auth != null && token.matches('^[A-Za-z0-9_-]{22}$')
    && validShare() && request.resource.data.blocked == false && ownerIsPro(request.auth.uid);
  allow update: if request.auth != null && resource.data.ownerUid == request.auth.uid
    && validShare() && request.resource.data.noteId == resource.data.noteId
    && request.resource.data.blocked == resource.data.blocked && ownerIsPro(request.auth.uid);
  allow delete: if request.auth != null && resource.data.ownerUid == request.auth.uid;
}
```

ルールのテストに, 「他人は作れない・書き換えられない」「無料の人は作れない」「無料に戻った持ち主の共有は読めない」「`blocked`は本人が戻せない」「一覧は読めない」を足します.

### 2.6 共有ページ

- `src/app/s/page.tsx` の静的ページです. `#`の後ろのtokenで `shares/{token}` を1件読み, 読み取り専用のエディターで表示します. ログインもアカウントの読み込みも しません.
- 表示の前に, 保存の検証と同じ許可リスト ([07_workspace_backup.md](07_workspace_backup.md)) で文書を確かめます. 未知のノード, 危険なURLスキーム, イベント属性を拒否し, リンクは `rel="noopener noreferrer nofollow"` で別のタブに開きます.
- 検索エンジンには載せません (`noindex`, robots.txtで `/s/` を除外).
- 見つからない・非公開・無料に戻ったときは, どれも同じ「このメモは公開されていません」を出します (理由を区別して漏らしません).
- ページの下に, 小さく「Draftaで作成」と「不適切な内容を報告」を置きます. 「Draftaで作成」をProで消せるかは未決のまま, 最初は全員に出します.

### 2.7 報告と非公開化

- 「不適切な内容を報告」は, 今のフィードバックの窓口へ, 共有ページのリンクを添えて送ります.
- Glesさんが確認し, Firebaseのコンソールで `blocked` を `true` にします. 本人からは戻せません. 運営の画面は作りません (件数が増えたら考えます).
- 利用規約 (B3) に, 共有した内容の責任と, 運営が非公開にできることを書きます.

## 3. メモの操作との関係

| 操作 | 共有 |
|---|---|
| 編集 | 保存のたびに写しも更新 (2.3) |
| ゴミ箱へ移す | 共有をやめます (写しを消し, `shareToken`も消す). 戻しても自動では再開しません |
| 完全に削除 | 同上 |
| 保存履歴から戻す | 戻した内容が保存され, 写しも更新されます |
| 書き出し・取り込み | `shareToken`は書き出しに含めません |
| ログアウト | 共有は続きます |

## 4. 画面 (ツールバーのボタン)

- メモのツールバーで, 履歴の隣に共有のアイコンを置きます. 共有中は アイコンの色を変え, 「共有中」と分かるようにします (自動で追従するため).
- 押すと小さな画面が開きます:
  - 共有していないとき: 「リンクを作成」. 公開されることと, 編集が自動で反映されることを1行で添えます.
  - 共有中: リンク, 「コピー」, 「ページを開く」, 「共有をやめる」.
  - 無料の方: Proの案内 (23のProの画面) を開きます.
- Proの開始 (B5) までは, 課金の画面と同じく 本番では出しません.
- 文言は11言語で用意します. 細かい見た目は, 作るときに案を並べて選んでもらいます (AGENTS.md, Options First).

## 5. 承認が必要な項目

| 項目 | 内容 | 主なリスク |
|---|---|---|
| S1. Firestoreルールの変更 | `shares/{token}` を足します (2.5). ルールの本番への公開は, Proの開始 (B5) の前にまとめて行えます | 書き方を誤ると, 他人の共有を書き換えたり, 非公開のものを読めたりする. ルールのテストで防ぎます |
| S2. 公開データの開始 | ログインしていない人に メモの内容を見せます. 報告と非公開化の運用が始まります | 違法な内容やスパムに使われる. 報告の窓口, `blocked`, 規約で対応します |

## 6. 段階と検証

| 段 | 内容 | 必要な承認 |
|---|---|---|
| C0 | この設計の承認 | ー |
| C1 | ルールとテスト, 写しの作成・追従・削除, 共有ページ. 新しい空のEmulatorと自分で作ったテストのデータで確かめます (作る・見る・編集が反映される・やめる・無料に戻ると見られない・再加入で戻る・blocked・一覧できない・危険な文書を拒否) | 手元: なし |
| C2 | ツールバーのボタンと画面 (案を並べて選んでもらう). 本番では隠したまま公開します | ー (通常の更新) |
| C3 | Proの開始 (B5) と合わせて, ルールを本番へ公開し, 機能を出します | S1, S2 |

## 7. 未決事項

- 「Draftaで作成」をProで消せるか (22の未決事項).
- 共有ページでの画像の扱い (Draftaが画像を持つようになったとき).
- 閲覧数の表示 (今は作りません).
