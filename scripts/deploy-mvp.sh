#!/bin/bash

# TourGuideAI MVP Deployment Script
# This script helps deploy the MVP to various platforms

set -e

echo "🚀 TourGuideAI MVP Deployment Script"
echo "===================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Check if build directory exists
if [ ! -d "build" ]; then
    echo "📦 Building application..."
    npm run build
    echo "✅ Build completed"
else
    echo "✅ Build directory found"
fi

# Check environment configuration
if [ ! -f ".env" ]; then
    echo "⚠️  Warning: .env file not found"
    echo "📋 Please create .env file with your production configuration"
    echo "   You can use env.production.template as a reference"
    echo ""
    echo "Required environment variables:"
    echo "- OPENAI_API_KEY"
    echo "- GOOGLE_MAPS_API_KEY" 
    echo "- JWT_SECRET"
    echo ""
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Test local server
echo "🧪 Testing local server..."
npm run server &
SERVER_PID=$!
sleep 5

# Test health endpoint
if curl -f -s http://localhost:${PORT:-3001}/health > /dev/null; then
    echo "✅ Health check passed"
else
    echo "❌ Health check failed"
    kill $SERVER_PID 2>/dev/null || true
    exit 1
fi

kill $SERVER_PID 2>/dev/null || true
echo "✅ Local server test completed"

echo ""
echo "🎯 Deployment Options:"
echo "1. Railway (Recommended)"
echo "2. Vercel"
echo "3. Heroku"
echo ""

read -p "Choose deployment platform (1-3): " -n 1 -r
echo

case $REPLY in
    1)
        echo "🚂 Railway Deployment Instructions:"
        echo "1. Go to https://railway.app"
        echo "2. Sign up/login with GitHub"
        echo "3. Click 'New Project' → 'Deploy from GitHub repo'"
        echo "4. Select your TourGuideAI repository"
        echo "5. Choose 'mvp-release' branch"
        echo "6. Railway will use railway.json configuration automatically"
        echo "7. Add environment variables in Railway dashboard"
        echo ""
        echo "📋 Required Environment Variables for Railway:"
        echo "OPENAI_API_KEY=your_key_here"
        echo "GOOGLE_MAPS_API_KEY=your_key_here"
        echo "JWT_SECRET=your_secret_here"
        echo "NODE_ENV=production"
        ;;
    2)
        echo "▲ Vercel Deployment Instructions:"
        echo "1. Install Vercel CLI: npm i -g vercel"
        echo "2. Run: vercel login"
        echo "3. Run: vercel --prod"
        echo "4. Follow prompts to deploy"
        echo "5. Add environment variables in Vercel dashboard"
        echo ""
        echo "📋 Required Environment Variables for Vercel:"
        echo "OPENAI_API_KEY=your_key_here"
        echo "GOOGLE_MAPS_API_KEY=your_key_here"
        echo "JWT_SECRET=your_secret_here"
        echo "NODE_ENV=production"
        ;;
    3)
        echo "🟣 Heroku Deployment Instructions:"
        echo "1. Install Heroku CLI"
        echo "2. Run: heroku login"
        echo "3. Run: heroku create your-app-name"
        echo "4. Run: heroku config:set OPENAI_API_KEY=your_key"
        echo "5. Run: heroku config:set GOOGLE_MAPS_API_KEY=your_key"
        echo "6. Run: heroku config:set JWT_SECRET=your_secret"
        echo "7. Run: heroku config:set NODE_ENV=production"
        echo "8. Run: git push heroku mvp-release:main"
        ;;
    *)
        echo "❌ Invalid option"
        exit 1
        ;;
esac

echo ""
echo "🎉 Deployment preparation complete!"
echo "📚 For detailed instructions, see docs/QUICK_DEPLOYMENT_GUIDE.md"
echo ""
echo "🔍 Post-deployment checklist:"
echo "- Test all pages load correctly"
echo "- Verify API integrations work"
echo "- Check mobile responsiveness"
echo "- Run performance audit"
echo ""
echo "✅ Your MVP is ready for launch!" 