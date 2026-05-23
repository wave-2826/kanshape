@echo off
setlocal enabledelayedexpansion

REM This entrypoint script checks that all required setup is done.
REM If not done, does it.
REM And then proceeds to execute the main "command" for this container.

cd /d "%~dp0"

REM Set default values if environment variables are not defined
if not defined PB_VERSION set "PB_VERSION=0.38.2"
if not defined PB_ARCH set "PB_ARCH=windows_amd64"

REM Get command arguments
set "CMD=%*"

if "%CMD%"=="" set "CMD=.\pocketbase.exe serve --dev --http 0.0.0.0:8090 --publicDir ..\sk\build"

if not exist "pocketbase.exe" (
    echo Fetching Pocketbase version: %PB_VERSION%, architecture: %PB_ARCH%
    set "url=https://github.com/pocketbase/pocketbase/releases/download/v%PB_VERSION%/pocketbase_%PB_VERSION%_%PB_ARCH%.zip"
    
    powershell -Command "Invoke-WebRequest -Uri '!url!' -OutFile '%TEMP%\pb.zip'"
    if errorlevel 1 (
        echo Failed to download Pocketbase
        exit /b 1
    )
    
    powershell -Command "Expand-Archive -Path '%TEMP%\pb.zip' -DestinationPath . -Force"
    if errorlevel 1 (
        echo Failed to extract Pocketbase
        exit /b 1
    )
)

REM Execute the command
echo Executing: %CMD%
%CMD%
if errorlevel 1 (
    echo Command failed with error code %errorlevel%
    exit /b %errorlevel%
)