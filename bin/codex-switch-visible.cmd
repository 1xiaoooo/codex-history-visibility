@echo off
setlocal

if "%~1"=="" (
  echo Usage: %~nx0 ^<provider-id^>
  echo Example: %~nx0 custom
  echo Example: %~nx0 openai
  exit /b 2
)

cmd /c codex-provider.cmd switch %~1
if errorlevel 1 exit /b %errorlevel%

set "CODEX_HOME_EFFECTIVE=%CODEX_HOME%"
if "%CODEX_HOME_EFFECTIVE%"=="" set "CODEX_HOME_EFFECTIVE=%USERPROFILE%\.codex"

node "%CODEX_HOME_EFFECTIVE%\skills\codex-history-visibility\scripts\repair-history.mjs"
exit /b %errorlevel%
