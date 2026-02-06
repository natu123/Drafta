---
name: drafta-retrospective
description: 直前に解決した問題の振り返りを定型フォーマットで作る。`.claude/commands/retro.md` 相当の依頼や、再発防止策・教訓の整理依頼で使う。
---

# Drafta Retrospective

- 共通仕様は `docs/automation-spec.md` を参照する。
- 出力は次の 3 セクションでまとめる。
  1. 問題の本質（症状 / 根本原因）
  2. 再発防止策（抽象教訓 / レビューチェック / 実装注意）
  3. 指示ファイルへの追記提案（必要時のみ）
- 冗長化せず、次回の開発で再利用できる粒度で書く。
