> Sync Source: `docs/automation-spec.md`（正本）
> Mapping: `.claude/commands/smart-commit.md` <-> `.codex/skills/drafta-smart-commit/SKILL.md`
> 更新時は先に `docs/automation-spec.md` を修正し、その後このファイルへ同期する。
# Smart-Commit Workflow

コミットを論理的なグループに分けて実行します。

## 実行手順

1. `git status` と `git diff` で変更を確認
2. 変更を論理的なグループに分類:
   - **Feat**: 新機能
   - **Fix**: バグ修正
   - **Refactor**: リファクタリング
   - **Style**: スタイル・見た目の変更
   - **Docs**: ドキュメント
   - **Chore**: その他（設定ファイル等）
3. グループごとに `git add <files>` → `git commit -m "<Type>: <説明>"` を繰り返す（日本語メッセージ）
4. 全コミット後に `git push`
5. **Project Milestone 報告**: 総コミット数と LOC（`src/` 内の ts, tsx, css 合算）を前回からの増分（+x）を併記して報告

## コミットメッセージ形式

```
<Type>: <日本語での簡潔な説明>

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

## 注意事項
- 論理的に独立した変更は別々のコミットに分ける
- 関連する変更はまとめる
- コミットメッセージは日本語で簡潔に

