@echo off
echo 🚀 Deploying SlotSwapper to Vercel...

REM Check if Vercel CLI is installed
vercel --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Vercel CLI not found. Installing...
    npm install -g vercel
)

REM Install dependencies
echo 📦 Installing dependencies...
npm install
cd backend && npm install && cd ../frontend && npm install && cd ..

REM Build the project
echo 🔨 Building project...
npm run vercel-build

REM Deploy to Vercel
echo 🌐 Deploying to Vercel...
vercel --prod

echo ✅ Deployment complete!
echo 📋 Don't forget to set up your environment variables in Vercel dashboard:
echo    - MONGODB_URI
echo    - JWT_SECRET
echo    - NODE_ENV=production
echo    - CORS_ORIGIN=https://your-app.vercel.app

pause