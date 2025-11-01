@echo off
echo 🚀 Safe Backend Deployment Script

echo Choose deployment version:
echo 1. Full version (with database and routes)
echo 2. Simple version (basic CORS test only)
echo 3. Current version (whatever is in index.ts)

set /p choice="Enter choice (1-3): "

cd api

if "%choice%"=="1" (
    echo 📦 Deploying full version...
    copy index.ts index-current.ts
    echo Full version ready
) else if "%choice%"=="2" (
    echo 📦 Deploying simple version...
    copy index.ts index-current.ts
    copy simple.ts index.ts
    echo Simple version ready
) else (
    echo 📦 Deploying current version...
)

cd ..
echo 🌐 Deploying to Vercel...
call vercel --prod

if "%choice%"=="2" (
    echo 🔄 Restoring original index.ts...
    cd api
    copy index-current.ts index.ts
    del index-current.ts
    cd ..
)

echo ✅ Deployment complete!
echo 🧪 Test your API:
echo    - Health: https://slot-swapper-jo5e.vercel.app/health
echo    - CORS Test: https://slot-swapper-jo5e.vercel.app/api/test-cors

pause