@echo off
echo 🚀 Safe Backend Deployment Script

echo Choose deployment version:
echo 1. Standalone version (self-contained, recommended)
echo 2. Simple version (basic CORS test only)
echo 3. Current version (whatever is in index.ts)

set /p choice="Enter choice (1-3): "

cd api

if "%choice%"=="1" (
    echo 📦 Deploying standalone version...
    if exist index.ts copy index.ts index-backup.ts
    copy standalone.ts index.ts
    echo Standalone version ready
) else if "%choice%"=="2" (
    echo 📦 Deploying simple version...
    if exist index.ts copy index.ts index-backup.ts
    copy simple.ts index.ts
    echo Simple version ready
) else (
    echo 📦 Deploying current version...
)

cd ..
echo 🌐 Deploying to Vercel...
call vercel --prod

if "%choice%"=="1" (
    echo 🔄 Restoring original index.ts...
    cd api
    if exist index-backup.ts (
        copy index-backup.ts index.ts
        del index-backup.ts
    )
    cd ..
) else if "%choice%"=="2" (
    echo 🔄 Restoring original index.ts...
    cd api
    if exist index-backup.ts (
        copy index-backup.ts index.ts
        del index-backup.ts
    )
    cd ..
)

echo ✅ Deployment complete!
echo 🧪 Test your API:
echo    - Health: https://slot-swapper-jo5e.vercel.app/health
echo    - Signup: POST https://slot-swapper-jo5e.vercel.app/api/auth/signup
echo    - Login: POST https://slot-swapper-jo5e.vercel.app/api/auth/login

pause