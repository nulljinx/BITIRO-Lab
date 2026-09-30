@echo off
cd /d "%~dp0"
set PORT=5198
echo BITIRO Lab 6 - http://127.0.0.1:5198/intermedio
where node >nul 2>nul
if %errorlevel% equ 0 (
  node tools\serve.mjs
) else (
  "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" tools\serve.mjs
)
pause
