---
name: codex-history-visibility
description: Repair Codex Desktop or CLI history visibility after switching model_provider. Use when old Codex conversations disappear, Recent/project history is blank, /resume cannot see expected sessions, provider metadata is mismatched between rollout files and state_5.sqlite, or the user asks to switch/sync Codex providers without losing visible conversation history.
---

# Codex History Visibility

## Overview

Use this skill to make historical Codex sessions visible again after `model_provider` changes. It coordinates three layers that must agree:

- `~/.codex/config.toml` current `model_provider`
- rollout metadata under `~/.codex/sessions` and `~/.codex/archived_sessions`
- SQLite/UI state in `~/.codex/state_5.sqlite` and `~/.codex/.codex-global-state.json`

## Default Workflow

1. Run a status check first:

```powershell
cmd /c codex-provider.cmd status
```

2. If the current provider is correct and history is missing, run the bundled repair script:

```powershell
cmd /c node "%USERPROFILE%\.codex\skills\codex-history-visibility\scripts\repair-history.mjs"
```

3. If the user wants to switch provider, prefer the wrapper command:

```powershell
cmd /c "%USERPROFILE%\.codex\codex-switch-visible.cmd" custom
cmd /c "%USERPROFILE%\.codex\codex-switch-visible.cmd" openai
```

4. Re-run status and confirm:

- rollout sessions match the current provider
- SQLite sessions match the current provider
- no `cwd paths needing repair` remains
- project visibility shows `exact cwd N/N`, not `verbatim cwd N`
- UI state has `sidebar-workspace-filter-v2 = all`

## Command Choice

- Use `codex-provider sync` when the provider is already selected in `config.toml`.
- Use `codex-provider switch <provider-id>` or `codex-switch-visible.cmd <provider-id>` when the user wants to change provider.
- Use `repair-history.mjs` after sync if Desktop is still blank or `cwd paths needing repair` persists.
- Use `cmd /c codex-provider.cmd ...` on Windows to avoid PowerShell execution-policy blocking `codex-provider.ps1`.

## Important Behavior

- The tool creates backups under `~/.codex/backups_state/provider-sync`.
- Do not manually edit `auth.json`; this workflow does not log users in or switch accounts.
- Active rollout files may be locked while Codex is running. If a locked file is skipped, ask the user to fully exit Codex and run the repair again.
- Codex Desktop may only show the first 50 recent sessions. If old sessions are beyond rank 50, the data can be repaired while the first screen still omits them.
- Sessions with `encrypted_content` from another provider/account may become visible but may still fail to continue or compact.

## Verification

The final status should look like this pattern:

```text
Rollout files:
  sessions: <provider>: <count>

SQLite state:
  sessions: <provider>: <count>

Project visibility:
  <project>: interactive <count>, ..., exact cwd <count>/<count>, verbatim cwd 0
```

If `cwd paths needing repair` reappears after a script run, run `repair-history.mjs` once more after Codex exits completely.
