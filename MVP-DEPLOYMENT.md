# TourGuide AI - MVP Quick Deployment Guide

## 🚀 Quick Start (5 minutes to deploy)

This guide will help you deploy a simplified version of TourGuide AI with only the essential features:
- JWT Authentication
- OpenAI Chat Integration
- Google Maps Integration
- Basic User Profile

## 📋 Prerequisites

1. **API Keys Required:**
   - OpenAI API Key ([Get it here](https://platform.openai.com/api-keys))
   - Google Maps API Key ([Get it here](https://developers.google.com/maps/gmp-get-started))

2. **Node.js** (v16 or higher)

## 🏗️ Setup Instructions

### 1. Activate MVP Branch
```bash
git checkout mvp-release
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Create a `.env` file in the root directory:
```env
OPENAI_API_KEY=your_openai_api_key_here
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
JWT_SECRET=your_super_secure_jwt_secret_here
PORT=3001
NODE_ENV=production
```

### 4. Switch to MVP App Component
```bash
# Rename the current App.js and use the MVP version
mv src/App.js src/App-Full.js
mv src/App-MVP.js src/App.js
```

### 5. Build for Production
```bash
npm run build
```

### 6. Start the Server
```bash
npm run server
```

Your app will be available at: `http://localhost:3001`

## 🌐 Deployment Options

### Option 1: Heroku (Recommended for quick deployment)

1. **Install Heroku CLI**
2. **Login and create app:**
```bash
heroku login
heroku create your-tourguide-app
```

3. **Set environment variables:**
```bash
heroku config:set OPENAI_API_KEY=your_key
heroku config:set GOOGLE_MAPS_API_KEY=your_key
heroku config:set JWT_SECRET=your_secret
heroku config:set NODE_ENV=production
```

4. **Deploy:**
```bash
git add .
git commit -m "MVP deployment"
git push heroku mvp-release:main
```

### Option 2: Netlify + Heroku (Frontend + Backend)

**Frontend (Netlify):**
1. Connect your GitHub repo to Netlify
2. Set build command: `npm run build`
3. Set publish directory: `build`

**Backend (Heroku):**
Follow Option 1 above for the backend API

### Option 3: Railway (Simple and fast)

1. **Connect GitHub repo to Railway**
2. **Set environment variables in Railway dashboard**
3. **Deploy automatically**

### Option 4: DigitalOcean App Platform

1. **Connect GitHub repo**
2. **Configure build settings:**
   - Build command: `npm run build`
   - Run command: `npm run server`
3. **Set environment variables**

## 🔧 What's Removed in MVP

The MVP version removes these complex features:
- ❌ Beta program features
- ❌ Role-based access control
- ❌ Analytics dashboard
- ❌ Email verification
- ❌ Admin dashboard
- ❌ Invite code system
- ❌ Feedback collection
- ❌ Complex testing framework
- ❌ Performance monitoring

## ✅ What's Included in MVP

- ✅ Simple JWT authentication
- ✅ OpenAI chat integration
- ✅ Google Maps integration
- ✅ Basic user profiles
- ✅ Responsive Material-UI design
- ✅ Core routing (Home, Chat, Map, Profile)

## 🔐 Default Test Account

- **Email:** demo@example.com
- **Password:** demo123

## 📝 Post-Deployment Steps

1. **Test the application:**
   - Register a new account
   - Try the chat feature
   - Test the map functionality

2. **Configure your APIs:**
   - Ensure OpenAI API key has sufficient credits
   - Enable necessary Google Maps APIs

3. **Security:**
   - Change the default JWT secret
   - Remove or change the demo account

## 🆘 Troubleshooting

### Common Issues:

1. **"Cannot GET /" error:**
   - Make sure you're using the MVP server: `node server/mvp-server.js`

2. **API Key errors:**
   - Verify your environment variables
   - Check API key permissions

3. **Build errors:**
   - Delete `node_modules` and `package-lock.json`
   - Run `npm install` again

## 📞 Support

If you need help with deployment:
1. Check the console logs for error messages
2. Verify all environment variables are set
3. Test locally first before deploying

## 🔄 Switching Back to Full Version

To switch back to the full version:
```bash
git checkout main
mv src/App.js src/App-MVP.js
mv src/App-Full.js src/App.js
npm install  # Reinstall full dependencies
``` 