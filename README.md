# Codex History Visibility

一个本地 Codex skill 和辅助脚本，用来处理切换 `model_provider` 后历史会话在 Codex Desktop 或 `/resume` 中不可见的问题。

有时候对话并没有丢，rollout 文件也还在，只是 `~/.codex/sessions`、`state_5.sqlite` 和 Desktop 的工作区状态之间出现了 provider / cwd 元数据不一致。本项目把这类修复流程整理成一个可复用的 skill，方便以后由 Codex 自动执行。

## 致谢

本项目的思路来自 [Dailin521/codex-provider-sync](https://github.com/Dailin521/codex-provider-sync)。

`codex-provider-sync` 对 Codex 切换 provider 后历史会话不可见的问题做了系统梳理，并提供了核心同步能力，包括：

- 同步 rollout 文件中的 provider 元数据
- 同步 `state_5.sqlite` 中的线程元数据
- 在执行前创建备份
- 支持 Windows GUI 和 CLI 使用方式

本项目不是替代 `codex-provider-sync`，而是一个面向 Codex agent 使用的配套 skill。它主要做三件事：

- 把修复流程写成 Codex 能自动遵循的 skill
- 提供两个本地 helper 命令，减少重复输入命令的成本
- 在同步后补充处理 Desktop 侧边栏状态和 SQLite `cwd` 路径格式问题

简单说：核心同步能力由 `codex-provider-sync` 提供；本项目负责把它整理成更适合日常 Codex Desktop 使用的工作流。

## 能修什么

- `~/.codex/sessions` 下的历史会话 provider 元数据
- `~/.codex/state_5.sqlite` 中的线程 provider / cwd 元数据
- `~/.codex/.codex-global-state.json` 中的 Desktop 侧边栏和工作区可见性状态
- 在 `openai`、`custom` 或其他已配置 provider 之间切换后出现的历史会话不可见问题

## 不修什么

- 不处理登录、账号、认证和 `auth.json`
- 不恢复已经删除或不存在的 rollout 文件
- 不把 `encrypted_content` 重新加密到另一个账号或 provider
- 不绕过 Codex Desktop 当前最近会话首屏数量限制

如果历史会话包含来自另一个账号或 provider 的 `encrypted_content`，本工具通常只能修复“列表可见性”。继续对话或 compact 仍可能失败。

## 依赖

- Node.js 24+
- 已安装 `codex-provider-sync`
- 使用默认 `~/.codex`，或显式设置 `CODEX_HOME`

安装 `codex-provider-sync`：

```powershell
npm install -g git+https://github.com/Dailin521/codex-provider-sync.git
```

Windows 下建议通过 `cmd /c codex-provider.cmd ...` 调用，避免 PowerShell execution policy 拦截 npm 生成的 `.ps1` shim。

## 安装

在本仓库目录下执行：

```powershell
powershell -ExecutionPolicy Bypass -File .\install.ps1
```

安装内容：

- `skill/codex-history-visibility` -> `%USERPROFILE%\.codex\skills\codex-history-visibility`
- `bin\codex-history-visible.cmd` -> `%USERPROFILE%\.codex\codex-history-visible.cmd`
- `bin\codex-switch-visible.cmd` -> `%USERPROFILE%\.codex\codex-switch-visible.cmd`

如果设置了 `CODEX_HOME`，安装脚本会使用 `CODEX_HOME` 指向的目录。

## 使用

当前 provider 不变，只修复历史会话可见性：

```powershell
cmd /c "%USERPROFILE%\.codex\codex-history-visible.cmd"
```

切换 provider，并同步历史会话：

```powershell
cmd /c "%USERPROFILE%\.codex\codex-switch-visible.cmd" custom
cmd /c "%USERPROFILE%\.codex\codex-switch-visible.cmd" openai
```

在 Codex 里也可以直接说：

```text
用 codex-history-visibility skill 帮我修复 Codex 历史会话可见性。
```

## 安全性

`codex-provider-sync` 会在同步前创建备份：

```text
~/.codex/backups_state/provider-sync
```

本项目的修复脚本在修改 `.codex-global-state.json` 前，也会额外创建一份备份。

建议在执行修复前完全退出 Codex Desktop。正在运行的会话可能会锁住当前 rollout 文件，导致该文件本轮被跳过。

## 检查结果

可以用下面命令检查状态：

```powershell
cmd /c codex-provider.cmd status
```

理想状态类似：

```text
Rollout files:
  sessions: custom: ...

SQLite state:
  sessions: custom: ...

Project visibility:
  ... exact cwd N/N, verbatim cwd 0
```

如果仍然看到 `cwd paths needing repair`，可以在完全退出 Codex 后再运行一次修复命令。

## License

MIT
