@echo off
echo Setting up Supabase for HushKey...

echo.
echo Step 1: Installing Supabase CLI (if not already installed)
echo This may require admin privileges...
echo.

REM Try to install Supabase CLI
npm install supabase -g 2>nul
if errorlevel 1 (
    echo.
    echo Supabase CLI installation failed. Please install manually:
    echo Visit: https://github.com/supabase/cli#install-the-cli
    echo Then run this script again.
    echo.
    pause
    exit /b 1
)

echo Supabase CLI installed successfully!

echo.
echo Step 2: Initialize Supabase project
supabase init

if errorlevel 1 (
    echo Failed to initialize Supabase. Please check the installation.
    pause
    exit /b 1
)

echo.
echo Step 3: Starting Supabase development environment...
supabase start

if errorlevel 1 (
    echo Failed to start Supabase. Please check for port conflicts (54322, 54323).
    pause
    exit /b 1
)

echo.
echo Supabase is running! Please update your .env.local file with:
echo VITE_SUPABASE_URL=http://127.0.0.1:54321
echo VITE_SUPABASE_ANON_KEY=[check supabase status for the anon key]

echo.
echo Then run the schema migration with: supabase db reset

pause
