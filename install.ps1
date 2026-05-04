$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$codexHome = if ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $HOME ".codex" }
$skillsRoot = Join-Path $codexHome "skills"
$targetSkill = Join-Path $skillsRoot "codex-history-visibility"

New-Item -ItemType Directory -Force -Path $skillsRoot | Out-Null
if (Test-Path $targetSkill) {
  Remove-Item -Recurse -Force -LiteralPath $targetSkill
}

Copy-Item -Recurse -LiteralPath (Join-Path $repoRoot "skill\codex-history-visibility") -Destination $targetSkill
Copy-Item -LiteralPath (Join-Path $repoRoot "bin\codex-history-visible.cmd") -Destination (Join-Path $codexHome "codex-history-visible.cmd") -Force
Copy-Item -LiteralPath (Join-Path $repoRoot "bin\codex-switch-visible.cmd") -Destination (Join-Path $codexHome "codex-switch-visible.cmd") -Force

Write-Host "Installed skill to $targetSkill"
Write-Host "Installed helper commands to $codexHome"
