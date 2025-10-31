@echo off
echo 🚀 Deploying SlotSwapper Backend and Frontend Separately...

echo 📦 Deploying Backend...
cd backend
call vercel --prod
cd ..

echo 📦 Deploying Frontend...
cd frontend
call vercel --prod
cd ..

echo ✅ Deployment complete!
echo 📋 Don't forget to:
echo    1. Set backend environment variables (MONGODB_URI, JWT_SECRET, CORS_ORIGIN)
echo    2. Set frontend environment variables (REACT_APP_API_URL)
echo    3. Redeploy both after setting environment variables

pause