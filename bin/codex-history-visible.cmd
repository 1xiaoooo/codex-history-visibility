@echo off
setlocal

set "CODEX_HOME_EFFECTIVE=%CODEX_HOME%"
if "%CODEX_HOME_EFFECTIVE%"=="" set "CODEX_HOME_EFFECTIVE=%USERPROFILE%\.codex"

node "%CODEX_HOME_EFFECTIVE%\skills\codex-history-visibility\scripts\repair-history.mjs"
exit /b %errorlevel%
