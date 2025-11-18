@echo off
echo Setting up Supabase Cloud for HushKey...

echo.
echo Step 1: Create a new Supabase project at https://supabase.com
echo Instructions:
echo 1. Go to https://supabase.com/dashboard
echo 2. Click "New project"
echo 3. Choose your organization
echo 4. Enter project details (name, database password, etc.)
echo 5. Wait for the project to be created (this can take a few minutes)
echo.

echo Step 2: After your project is created, get your credentials:
echo - Project URL: Go to Settings ^> API ^> URL
echo - Anon Key: Go to Settings ^> API ^> anon public key
echo.

echo Step 3: Update the .env.local file with your credentials:
echo Edit hushkey-app/.env.local and replace the placeholder values
echo.

echo Step 4: Run the database schema:
echo - Go to your Supabase dashboard
echo - Click on the SQL Editor (or go to /project/YOUR_PROJECT/sql)
echo - Copy and paste the contents of supabase-schema.sql
echo - Click "Run" to execute the schema
echo.

echo Step 5: Enable Row Level Security (RLS):
echo The schema will set this up automatically, but you can verify:
echo - Go to Authentication ^> Policies in your Supabase dashboard
echo - Ensure policies are created for proper access control
echo.

echo Step 6: Test the connection:
echo Run: npm run dev
echo Visit localhost:5173 and try registering a new account
echo.

echo.
echo Important URLs:
echo - Dashboard: https://supabase.com/dashboard
echo - Documentation: https://supabase.com/docs
echo - Status: https://status.supabase.com
echo.

pause
