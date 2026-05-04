# Codex History Visibility

A local Codex skill and helper scripts for repairing Codex history visibility after switching `model_provider`.

When Codex Desktop or `/resume` appears to lose old conversations after a provider switch, the sessions are often still present on disk. The usual problem is metadata drift between rollout files, `state_5.sqlite`, and Codex Desktop workspace state.

This project is inspired by and built around [`Dailin521/codex-provider-sync`](https://github.com/Dailin521/codex-provider-sync). That project identified the core issue and provides the main provider/session synchronization engine. This repository packages the workflow as a Codex skill and adds a small repair layer for Desktop sidebar state and SQLite cwd cleanup.

## Relationship To Dailin521/codex-provider-sync

`Dailin521/codex-provider-sync` is the core tool. It synchronizes provider metadata across rollout files and SQLite state, creates backups, supports provider switching, and includes Windows GUI/CLI workflows.

This repository is intentionally smaller and complementary:

- It provides a Codex skill so an agent knows when and how to run the repair workflow.
- It wraps the CLI with local helper commands for repeated use.
- It resets Desktop sidebar visibility state when the history exists but the UI is still blank.
- It performs an extra SQLite cwd cleanup pass based on rollout `session_meta.cwd` when path formatting drifts.

The idea, diagnosis, and most of the heavy lifting come from `codex-provider-sync`; this project is a workflow/skill layer learned from using it on a real Codex Desktop history issue.

## What It Fixes

- Rollout files under `~/.codex/sessions`
- SQLite thread provider and cwd metadata in `~/.codex/state_5.sqlite`
- Codex Desktop sidebar/workspace visibility state in `~/.codex/.codex-global-state.json`
- Provider mismatches after switching between `openai`, `custom`, or other configured providers

## What It Does Not Fix

- Login, auth, accounts, or `auth.json`
- Missing or deleted rollout files
- Re-encryption of `encrypted_content` across accounts/providers
- Codex Desktop's first-page recent-history limit

Sessions with encrypted content from a different account/provider may become visible but can still fail to continue or compact.

## Requirements

- Codex using the standard `~/.codex` home, or `CODEX_HOME` set explicitly
- Node.js 24+
- `codex-provider-sync` installed:

```powershell
npm install -g git+https://github.com/Dailin521/codex-provider-sync.git
```

On Windows, commands use `cmd /c codex-provider.cmd ...` to avoid PowerShell execution-policy issues with npm-generated `.ps1` shims.

## Install

From this repository:

```powershell
powershell -ExecutionPolicy Bypass -File .\install.ps1
```

This copies:

- `skill/codex-history-visibility` to `%USERPROFILE%\.codex\skills\codex-history-visibility`
- `bin\codex-history-visible.cmd` and `bin\codex-switch-visible.cmd` to `%USERPROFILE%\.codex`

If `CODEX_HOME` is set, the installer uses that instead of `%USERPROFILE%\.codex`.

## Usage

After switching provider or when history disappears:

```powershell
cmd /c "%USERPROFILE%\.codex\codex-history-visible.cmd"
```

To switch provider and then sync history:

```powershell
cmd /c "%USERPROFILE%\.codex\codex-switch-visible.cmd" custom
cmd /c "%USERPROFILE%\.codex\codex-switch-visible.cmd" openai
```

Inside Codex, ask:

```text
Use the codex-history-visibility skill to repair my Codex history visibility.
```

## Safety

The underlying sync command creates backups under:

```text
~/.codex/backups_state/provider-sync
```

The repair script also backs up `.codex-global-state.json` before changing sidebar state.

For the cleanest repair, fully exit Codex Desktop before running the repair. Active sessions can lock their current rollout file.

## Verification

A successful status should show matching providers and no cwd repair warning:

```text
Rollout files:
  sessions: custom: ...

SQLite state:
  sessions: custom: ...

Project visibility:
  ... exact cwd N/N, verbatim cwd 0
```

Run:

```powershell
cmd /c codex-provider.cmd status
```

## License

MIT
