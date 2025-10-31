# SlotSwapper Deployment Guide

## Deploying to Vercel

### Prerequisites
1. A Vercel account (sign up at https://vercel.com)
2. MongoDB Atlas database (or another MongoDB hosting service)
3. Git repository with your code

### Step 1: Prepare Environment Variables

You'll need to set up the following environment variables in Vercel:

#### Backend Environment Variables:
- `MONGODB_URI` - Your MongoDB connection string
- `JWT_SECRET` - A secure random string for JWT token signing
- `NODE_ENV` - Set to "production"
- `CORS_ORIGIN` - Your Vercel domain (e.g., https://your-app.vercel.app)

#### Frontend Environment Variables:
- `REACT_APP_API_URL` - Set to "/api" (already configured in .env.production)

### Step 2: Deploy via Vercel CLI

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Deploy from your project root:
   ```bash
   vercel
   ```

4. Follow the prompts:
   - Link to existing project or create new one
   - Set up environment variables when prompted

### Step 3: Deploy via Vercel Dashboard

1. Go to https://vercel.com/dashboard
2. Click "New Project"
3. Import your Git repository
4. Configure the project:
   - Framework Preset: Other
   - Root Directory: ./
   - Build Command: `npm run vercel-build`
   - Output Directory: `frontend/build`
   - Install Command: Leave empty (Vercel will auto-detect)

5. Add environment variables in the project settings

### Step 4: Set Up MongoDB Atlas

1. Create a MongoDB Atlas account at https://www.mongodb.com/atlas
2. Create a new cluster
3. Create a database user
4. Whitelist Vercel's IP addresses (or use 0.0.0.0/0 for all IPs)
5. Get your connection string and add it as `MONGODB_URI` in Vercel

### Step 5: Configure Domain (Optional)

1. In Vercel dashboard, go to your project settings
2. Navigate to "Domains"
3. Add your custom domain if you have one

### Environment Variables Setup

In your Vercel project dashboard, add these environment variables:

```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/slotswapper?retryWrites=true&w=majority
JWT_SECRET=your-super-secret-jwt-key-here
NODE_ENV=production
CORS_ORIGIN=https://your-app.vercel.app
```

### Troubleshooting

1. **Build Errors**: Check the build logs in Vercel dashboard
2. **API Errors**: Ensure MongoDB connection string is correct
3. **CORS Issues**: Make sure CORS_ORIGIN matches your Vercel domain
4. **Environment Variables**: Double-check all required env vars are set

### Local Development vs Production

- Local: Uses `http://localhost:5000/api` for API calls
- Production: Uses `/api` (relative path) which routes to serverless functions

### Monitoring

- Check Vercel dashboard for deployment status
- Monitor function logs for API errors
- Use Vercel Analytics for performance monitoring