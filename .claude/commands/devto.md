> Sync Source: `docs/automation-spec.md`（正本）
> Mapping: `.claude/commands/devto.md` <-> `.codex/skills/drafta-devto-article/SKILL.md`
> 更新時は先に `docs/automation-spec.md` を修正し、その後このファイルへ同期する。
# Dev.to 記事作成

Claude Codeでスタックした問題について、Dev.toに投稿する記事を作成します。

## 手順

1. **トピックの確認**: どの問題について記事を書くか確認
2. **記事の構成**:
   - The Problem（症状）
   - Why Claude Code Got Stuck（なぜAIがハマったか）
   - Root Cause Analysis（根本原因）
   - The Solution（解決策・コードスニペット）
   - Key Takeaways for AI Agents（AI向けのまとめ）
   - Keywords for search（検索用キーワード）

3. **MDファイル作成**: `docs/devto-article-XX-[topic].md` に保存
4. **フォルダを開く**: 作成後、docsフォルダを開く

## 記事フォーマット

```markdown
---
title: Claude Code Stuck on [Specific Error]: How I Fixed It with [Solution]
tags: claudecode, [tech1], [tech2], [tech3]
---

## The Problem
...

## Why Claude Code Got Stuck
...

## Root Cause Analysis
...

## The Solution
...

## Key Takeaways for AI Agents

**Claude Code users: if you're hitting this, try:**
1. ...
2. ...

**Keywords for search:**
[検索キーワード1], [検索キーワード2], ...

---

*This article is part of the "Claude Code Debugging Chronicles" series, documenting real debugging sessions with AI coding assistants.*

**Related Articles:**
- [Part N: タイトル](URL)
```

## タグのルール
- 必ず `claudecode` を含める
- 技術スタック関連を2-3個（例: tiptap, prosemirror, javascript）
- 合計4つまで

## シリーズ
- シリーズ名: `Claude Code Debugging Chronicles`
- 関連記事へのリンクを末尾に追加

