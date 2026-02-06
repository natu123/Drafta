---
name: drafta-smart-commit
description: 変更を論理グループへ分割してコミット運用する。`.claude/commands/smart-commit.md` 相当の依頼や、コミット整理・メッセージ整備・マイルストーン報告で使う。
---

# Drafta Smart Commit

- 共通仕様は `docs/automation-spec.md` を参照する。
- 実行順序:
  1. `git status` / `git diff` を確認
  2. Feat/Fix/Refactor/Style/Docs/Chore に分類
  3. グループ単位で `git add` と `git commit -m "<Type>: <説明>"`
  4. 全コミット後に `git push`
  5. 総コミット数と LOC 増分を報告
- コミットメッセージは日本語で簡潔に書く。
- 独立した変更は分離し、関連変更は同一コミットにまとめる。
