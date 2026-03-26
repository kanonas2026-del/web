@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ----------------------------------------
echo Ukulele local server
echo Folder: %CD%
echo Port  : 8001
echo ----------------------------------------
where py >nul 2>nul
if %errorlevel%==0 goto run_py
where python >nul 2>nul
if %errorlevel%==0 goto run_python
echo.
echo Python / py が見つかりません。
echo この画面をそのまま見せてください。
pause
goto :eof

:run_py
echo py で起動します...
py -m http.server 8001
pause
goto :eof

:run_python
echo python で起動します...
python -m http.server 8001
pause
goto :eof
