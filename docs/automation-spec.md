# Drafta Automation Spec

このファイルを、Claude Commands と Codex Skills の共通仕様（正本）とする。

## Mappings
- `.claude/commands/devto.md` <-> `.codex/skills/drafta-devto-article/SKILL.md`
- `.claude/commands/retro.md` <-> `.codex/skills/drafta-retrospective/SKILL.md`
- `.claude/commands/smart-commit.md` <-> `.codex/skills/drafta-smart-commit/SKILL.md`

## 1) Dev.to Article
目的: Claude Code で詰まった問題の解決ログを Dev.to 記事化する。

必須構成:
- The Problem
- Why Claude Code Got Stuck
- Root Cause Analysis
- The Solution
- Key Takeaways for AI Agents
- Keywords for search

保存先:
- `docs/devto-article-XX-[topic].md`

タグルール:
- `claudecode` を必ず含める
- 技術タグは 2-3 個
- 合計 4 タグまで

## 2) Retrospective
目的: 直前に解決した問題の再発防止を言語化する。

出力:
- 問題の本質（症状 / 根本原因）
- 再発防止策（教訓 / レビューチェック / 設計・実装注意）
- 指示ファイル追記提案（必要時）

## 3) Smart Commit
目的: 変更を論理単位で分割コミットする。

手順:
1. `git status` と `git diff` を確認
2. Feat/Fix/Refactor/Style/Docs/Chore に分類
3. グループごとに `git add` + `git commit`
4. 最後に `git push`
5. Milestone（総コミット数と LOC 増分）を報告

Milestone集計ルール（固定）:
- 総コミット数: `git rev-list --count HEAD`
- LOC: **リポジトリ全体の git 追跡ファイルを対象**に集計する
- 除外: `package-lock.json` のみ
- `Drafta_Web/src` など部分範囲のLOCは Milestone には使わない

コミットメッセージ:
- `<Type>: <日本語で簡潔な説明>`

## 4) Dev Server & Build Operations
目的: 開発サーバーと build 実行時の手順ブレを防ぐ。

運用ルール（固定）:
- 開発サーバーは `Drafta_Web` で起動する
- devサーバーのポートは `9002` 固定
- `build` 実行前は dev サーバーを停止する
- シェルは PowerShell を前提とする

標準コマンド（PowerShell）:
- dev起動: `Set-Location "...\Drafta_Web"; npm run dev`
- dev停止（例）: `Get-NetTCPConnection -LocalPort 9002 -State Listen | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }`
- build実行: `Set-Location "...\Drafta_Web"; npm run build`

## Sync Policy
- 仕様変更は最初にこのファイルを更新する。
- その後、Claude Commands と Codex Skills を同期する。
- ツール固有差分のみ各ファイルに残す。
