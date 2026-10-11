@echo off
title FreshGuard - Launch All
echo Starting FreshGuard Backend and Frontend...
start "FreshGuard Backend" "%~dp0start_backend.bat"
start "FreshGuard Frontend" "%~dp0start_frontend.bat"
