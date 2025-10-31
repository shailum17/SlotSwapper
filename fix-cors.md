# Quick CORS Fix Guide

## Step 1: Update Backend Environment Variables

Go to your backend Vercel project dashboard (https://vercel.com/dashboard) and add these environment variables:

```
CORS_ORIGIN=https://slot-swapper-eight.vercel.app
MONGODB_URI=your-mongodb-connection-string
JWT_SECRET=your-jwt-secret
NODE_ENV=production
```

## Step 2: Update Frontend Environment Variables

Go to your frontend Vercel project dashboard and add:

```
REACT_APP_API_URL=https://slot-swapper-jo5e.vercel.app/api
```

## Step 3: Redeploy Both Projects

After updating environment variables, redeploy both projects:

1. Go to your backend project dashboard → Deployments → Click "Redeploy"
2. Go to your frontend project dashboard → Deployments → Click "Redeploy"

## Alternative: Quick Test

If you want to test immediately, you can update the backend CORS to allow all origins temporarily:

In `backend/api/index.ts`, change:
```javascript
app.use(cors({
  origin: '*',  // Allow all origins (ONLY for testing)
  credentials: false
}));
```

**⚠️ Warning**: Only use `origin: '*'` for testing. Always specify your actual frontend domain in production.

## Verify the Fix

After redeployment, check:
1. Open browser dev tools
2. Go to your frontend URL
3. Try to login
4. Check if CORS errors are gone

The API calls should now work without CORS errors.