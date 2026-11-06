@echo off
title Market Learning (desktop test)
rem Runs the Market Learning App on this laptop for testing before an APK: the same app and prices as the phone,
rem in a phone-sized window. Builds the web version of the current code first (about a minute), then serves it on
rem http://127.0.0.1:8080 with the data helper on 8787. Close this window (or Ctrl+C) to stop.
echo ==============================================================
echo   Market Learning - desktop test
echo   1. Putting the latest prices inside the app
echo   2. Building the web version of the current code (about a minute)
echo   3. Opening it in a phone-sized window on http://127.0.0.1:8080
echo ==============================================================
cd /d "%~dp0"

call pnpm market:bundle || goto :failed
call pnpm --filter @trading/app export:web || goto :failed

rem A separate browser profile keeps the test data (profiles, orders) apart from normal browsing and between runs.
set PROFILE_DIR=%LOCALAPPDATA%\MarketLearningDesktopTest
set CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe
if not exist "%CHROME%" set CHROME=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe
start "" powershell -WindowStyle Hidden -Command "Start-Sleep -Seconds 4; Start-Process -FilePath '%CHROME%' -ArgumentList '--app=http://127.0.0.1:8080','--window-size=430,930','--user-data-dir=%PROFILE_DIR%'"

call pnpm uat:start
goto :eof

:failed
echo.
echo The build did not finish. Scroll up for the first error and send it to Claude.
pause
