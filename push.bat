@echo off
setlocal
cd /d "%~dp0"
title Push Token to GitHub

set REPO=https://github.com/dhanushquinn-collab/my-token-campus-canteen.git
set PAGE=https://github.com/dhanushquinn-collab/my-token-campus-canteen

echo.
echo   Pushing Token to GitHub
echo   -----------------------
echo.

where git >nul 2>&1
if errorlevel 1 goto nogit

if not exist "client\package.json" goto wrongfolder

if not exist ".git" git init

rem Use a GitHub no-reply address only if git has no identity yet,
rem so your real email never ends up in a public commit.
git config user.name >nul 2>&1
if errorlevel 1 git config user.name "dhanushquinn-collab"
git config user.email >nul 2>&1
if errorlevel 1 git config user.email "dhanushquinn-collab@users.noreply.github.com"

git add -A

rem Safety stop: never publish a .env file or node_modules.
git ls-files | findstr /r /c:"\.env$" >nul
if not errorlevel 1 goto leak
git ls-files | findstr /c:"node_modules/" >nul
if not errorlevel 1 goto leak

git commit -m "Token: campus canteen pre-order system" >nul 2>&1
git rev-parse --verify HEAD >nul 2>&1
if errorlevel 1 goto nocommit
git branch -M main

git remote remove origin >nul 2>&1
git remote add origin %REPO%

echo   A browser window may open so you can sign in to GitHub. Approve it.
echo.

git fetch origin
if errorlevel 1 goto pushfail

rem The new repo only holds GitHub's auto-made README, so this replaces it.
git push -u origin main --force-with-lease
if errorlevel 1 goto pushfail

echo.
echo   Done. Your project is on GitHub:
echo   %PAGE%
echo.
start "" %PAGE%
pause
exit /b 0

:nogit
echo   Git is not installed. Opening the download page.
echo   Install it with the default options, then double-click this file again.
start "" https://git-scm.com/download/win
pause
exit /b 1

:wrongfolder
echo   This file is not in the project folder.
echo   Put it next to the client and server folders, then run it again.
pause
exit /b 1

:leak
echo   STOPPED: a .env or node_modules file was about to be published.
echo   Nothing was pushed. Tell Claude what this screen says.
pause
exit /b 1

:nocommit
echo   Could not create the commit. Tell Claude what is shown above.
pause
exit /b 1

:pushfail
echo.
echo   The push did not go through. Tell Claude what is shown above.
pause
exit /b 1
