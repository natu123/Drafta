# Drafta - CLAUDE Instructions

## Positioning
- このファイルは Claude Code 用の互換ファイル
- プロジェクト指示の正本は `AGENTS.md`
- 詳細ルールは `AGENTS.md` を参照し、ここには Claude 固有差分だけを書く

## Sync Rule
- 仕様変更時は AGENTS.md を先に更新する
- 自動化コマンド仕様は docs/automation-spec.md を先に更新する
- CLAUDE.md は最小差分だけ追従する（内容の重複コピーはしない）

## Claude-Specific Notes
- Claude Code の Bash ツールは Unix 系シェル前提
- そのためコマンド提案は `rm`, `ls`, `&&` など Bash 構文を許可
- ただし、ユーザーが PowerShell 実行を前提にしている場合は PowerShell 構文を優先

## Canonical Reference
- `AGENTS.md` を常に最優先で解釈する

