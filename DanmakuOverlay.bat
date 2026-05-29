@echo off
chcp 65001 >nul
title Danmaku Overlay

REM Add real Python to PATH (before Windows Store stub)
set "PATH=C:\Users\Suu\AppData\Local\Programs\Python\Python312;C:\Users\Suu\AppData\Local\Programs\Python\Python312\Scripts;%PATH%"

REM API config
set "MIMO_API_KEY=YOUR_API_KEY_HERE"
set "MIMO_API_BASE=https://token-plan-cn.xiaomimimo.com/v1"

cd /d "%~dp0electron\dist\win-unpacked"
start "" "DanmakuOverlay.exe"
