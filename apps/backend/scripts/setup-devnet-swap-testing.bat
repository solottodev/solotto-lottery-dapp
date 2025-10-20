@echo off
REM Setup script for Jupiter Swap devnet testing (Windows)
REM This configures your environment to test swaps with USDC-Dev

echo ==========================================
echo Jupiter Swap Devnet Testing Setup
echo ==========================================
echo.

REM Check if .env file exists
if not exist .env (
    echo Error: .env file not found
    echo Please create .env from .env.supabase.example first
    echo.
    echo   copy .env.supabase.example .env
    echo.
    exit /b 1
)

echo Found .env file
echo.

REM Backup existing .env
echo Creating backup: .env.backup
copy .env .env.backup >nul

REM Update LOTTO_MINT_ADDRESS for devnet testing
echo Configuring for devnet swap testing...
echo.

REM Create a temporary file with updated configuration
powershell -Command "(Get-Content .env) | ForEach-Object { if ($_ -match '^LOTTO_MINT_ADDRESS=') { 'LOTTO_MINT_ADDRESS=\"4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU\"  # USDC-Dev for testing' } else { $_ } } | Set-Content .env.tmp"

REM Replace original file
move /y .env.tmp .env >nul

echo Updated LOTTO_MINT_ADDRESS to USDC-Dev
echo.

REM Verify network setting
findstr /C:"SOLANA_NETWORK=\"devnet\"" .env >nul
if %errorlevel% equ 0 (
    echo Network is set to devnet
) else (
    echo Warning: SOLANA_NETWORK is not set to devnet
    echo    Please verify your network configuration
)

echo.
echo ==========================================
echo Setup Complete!
echo ==========================================
echo.
echo Configuration:
echo   Token: USDC-Dev (4zMMC9...ncDU^)
echo   Network: Devnet
echo   Decimals: 6
echo.
echo Next steps:
echo   1. Restart your backend: npm run dev
echo   2. Review: ..\..\DEVNET_TESTING_GUIDE.md
echo   3. Run Test 1: SOL distribution (baseline^)
echo   4. Run Test 2: Jupiter swap with small amounts
echo.
echo To restore original configuration:
echo   copy .env.backup .env
echo.
