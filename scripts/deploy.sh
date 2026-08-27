#!/bin/bash
# ==============================================================================
# Production Deployment Automation Script for Talking Wave
# ==============================================================================

set -e

echo "🚀 Starting Talking Wave Call Center Auto-Dialer Deployment..."

# 1. Install Backend Dependencies & Migrate
echo "📦 Installing backend packages and compiling..."
cd backend
npm install --production=false
npx prisma db push
npm run build

# 2. Install Frontend Dependencies & Build Bundle
echo "🎨 Building frontend production bundle..."
cd ../frontend
npm install
npm run build

# 3. PM2 Process Management
echo "🔄 Reloading PM2 processes..."
cd ../backend
if pm2 list | grep -q "dialer-api"; then
  pm2 reload dialer-api
else
  pm2 start dist/server.js --name "dialer-api" --instances max --exec-mode cluster
fi

echo "✅ NexusDial Deployment completed successfully!"
