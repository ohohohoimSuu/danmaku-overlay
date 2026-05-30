@echo off
chcp 65001 >nul
title Danmaku Settings

REM Add real Python to PATH (before Windows Store stub)
set "PATH=C:\Users\Suu\AppData\Local\Programs\Python\Python312;C:\Users\Suu\AppData\Local\Programs\Python\Python312\Scripts;%PATH%"

REM API config — 从 api-config.json 读取，或手动设置环境变量
REM set "MIMO_API_KEY=你的API_KEY"
REM set "MIMO_API_BASE=https://token-plan-cn.xiaomimimo.com/v1"

cd /d "%~dp0electron\dist\win-unpacked"
start "" "DanmakuOverlay.exe" --settings
