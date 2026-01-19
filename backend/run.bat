@echo off
echo ========================================
echo Starting Backend Server
echo ========================================
echo.

REM Check if virtual environment exists
if not exist "venv\" (
    echo ERROR: Virtual environment not found!
    echo Please run 'setup.bat' first to install dependencies
    echo.
    pause
    exit /b 1
)

REM Activate virtual environment
echo Activating virtual environment...
call .venv311\Scripts\activate.bat
if errorlevel 1 (
    echo ERROR: Failed to activate virtual environment
    pause
    exit /b 1
)
echo.

REM Check if .env file exists
if not exist ".env" (
    echo WARNING: .env file not found!
    echo The server may fail to start without proper environment variables
    echo.
)

REM Check if requirements are installed
echo Checking dependencies...
python -c "import fastapi" >nul 2>&1
if errorlevel 1 (
    echo ERROR: Dependencies not installed!
    echo Please run 'setup.bat' first
    echo.
    pause
    exit /b 1
)
echo Dependencies OK
echo.

REM Start the server
echo Starting FastAPI server...
echo Server will be available at: http://localhost:8000
echo Press CTRL+C to stop the server
echo.
echo ========================================
echo.

uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

pause

