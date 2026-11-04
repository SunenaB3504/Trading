@echo off
title Astro-Financial Simulator Terminal
echo ==============================================================
echo   Astro-Financial Terminal Simulator
echo   Launching Vite Engine on http://localhost:5173 ...
echo ==============================================================
cd /d "c:\Users\Admin\Sunil\Trading"

:: Open default web browser in 3 seconds once server initializes
start "" powershell -WindowStyle Hidden -Command "Start-Sleep -Seconds 3; Start-Process 'http://localhost:5173'"

:: Launch simulator
call pnpm run simulator

