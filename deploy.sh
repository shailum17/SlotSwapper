#!/bin/bash

# SlotSwapper Deployment Script for Vercel

echo "🚀 Deploying SlotSwapper to Vercel..."

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm run install-all

# Build the project
echo "🔨 Building project..."
cd frontend && npm run build && cd ..

# Deploy to Vercel
echo "🌐 Deploying to Vercel..."
vercel --prod

echo "✅ Deployment complete!"
echo "📋 Don't forget to set up your environment variables in Vercel dashboard:"
echo "   - MONGODB_URI"
echo "   - JWT_SECRET" 
echo "   - NODE_ENV=production"
echo "   - CORS_ORIGIN=https://your-app.vercel.app"