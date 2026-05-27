@echo off
chcp 65001 >nul
title Danmaku Overlay
cd /d "%~dp0electron\dist\win-unpacked"
start "" "DanmakuOverlay.exe"
