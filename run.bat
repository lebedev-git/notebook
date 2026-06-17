@echo off
title Open Notebook Launcher

echo Reloading PATH to include newly installed tools...
for /f "delims=" %%i in ('powershell -NoProfile -Command "[System.Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path', 'User')"') do set "NEW_PATH=%%i"
if defined NEW_PATH (
    set "PATH=%NEW_PATH%"
)

echo Checking dependencies...
where surreal >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: surrealdb is not in PATH. Make sure it is installed.
    pause
    exit /b 1
)
where uv >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: uv is not in PATH. Make sure it is installed.
    pause
    exit /b 1
)
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: npm is not in PATH. Make sure Node.js is installed.
    pause
    exit /b 1
)

echo Creating data directories...
if not exist "c:\Disk D\Project\Notebook-data\surrealdb" (
    mkdir "c:\Disk D\Project\Notebook-data\surrealdb"
)

echo Starting SurrealDB database...
start "Open Notebook DB (SurrealDB)" cmd /c "surreal start --log info --user root --pass root rocksdb:\"c:\Disk D\Project\Notebook-data\surrealdb\""

echo Waiting for database to initialize (5 seconds)...
timeout /t 5 /nobreak >nul

echo Starting Backend API Server...
start "Open Notebook Backend" cmd /c "uv run python run_api.py"

echo Starting Command Worker...
start "Open Notebook Worker" cmd /c "set PYTHONIOENCODING=utf-8 && uv run surreal-commands-worker --import-modules commands"

echo Starting Frontend Dev Server...
start "Open Notebook Frontend" cmd /c "cd frontend && npm.cmd run dev -- -p 8502"


echo.
echo ==========================================
echo Open Notebook is launching!
echo.
echo Database: ws://127.0.0.1:8000/rpc
echo Backend API: http://127.0.0.1:5055
echo Frontend UI: http://127.0.0.1:8502
echo ==========================================
echo.
echo You can close this window now. The servers are running in separate background windows.
pause
