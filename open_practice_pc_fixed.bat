@echo off
setlocal

set ROOT=C:\Users\manab\OneDrive\デスクトップ\web
set PORT=8001
set URL=http://127.0.0.1:%PORT%/app/index.html?v=pc

cd /d "%ROOT%"

where py >nul 2>nul
if %errorlevel%==0 goto use_py

where python >nul 2>nul
if %errorlevel%==0 goto use_python

echo Python / py が見つかりません。
pause
goto :eof

:use_py
start "Ukulele Local Server" cmd /k "cd /d ""%ROOT%"" && py -m http.server %PORT%"
timeout /t 2 /nobreak >nul
start "" "%URL%"
goto :eof

:use_python
start "Ukulele Local Server" cmd /k "cd /d ""%ROOT%"" && python -m http.server %PORT%"
timeout /t 2 /nobreak >nul
start "" "%URL%"
goto :eof
