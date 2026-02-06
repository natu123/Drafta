---
name: drafta-devto-article
description: Dev.to向けの技術記事を、Claude Codeで詰まった不具合の解決ログから構成化して作成する。`.claude/commands/devto.md` 相当の依頼や、The Problem/Root Cause/The Solution形式の記事化依頼で使う。
---

# Drafta Dev.to Article

- 共通仕様は `docs/automation-spec.md` を参照する。
- 記事構成を以下の順で作る。
  1. The Problem
  2. Why Claude Code Got Stuck
  3. Root Cause Analysis
  4. The Solution
  5. Key Takeaways for AI Agents
  6. Keywords for search
- frontmatter に `title` と `tags` を入れる。
- タグは `claudecode` を必須にし、合計 4 つ以内にする。
- 出力先は `docs/devto-article-XX-[topic].md` を使う。
- 末尾にシリーズ文言と関連記事セクションを付ける。
