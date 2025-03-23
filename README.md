# TourGuideAI

An AI-powered travel planning application that helps users plan personalized travel itineraries and explore destinations.

## Features

- Chat-based travel planning interface
- Interactive map visualization of travel routes
- Detailed timeline view of daily activities
- Offline capability for saved routes
- User profile management
- Role-based access control for beta testers and administrators
- Email notifications with verification and password reset capabilities
- Comprehensive onboarding workflow for new beta users
- Customizable survey system with conditional logic
- Analytics dashboard with real-time usage metrics
- Feedback collection with screenshot and recording capabilities

## Getting Started

These instructions will help you set up and run the project on your local machine for development and testing purposes.

### Prerequisites

- Node.js (v14.0.0 or higher)
- npm (v6.0.0 or higher)
- Google Maps API key
- OpenAI API key
- SendGrid API key (for email notifications)

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/TourGuideAI.git
   cd TourGuideAI
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create environment files:

   Create a `.env` file in the root directory:
   ```
   # API Configuration
   REACT_APP_API_URL=http://localhost:5000/api
   REACT_APP_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here

   # Feature Flags
   REACT_APP_ENABLE_OFFLINE_MODE=true
   REACT_APP_ENABLE_CACHING=true

   # Cache Configuration
   REACT_APP_CACHE_EXPIRY=86400
   REACT_APP_MAX_CACHE_SIZE=52428800
   ```

   Create a `.env` file in the server directory:
   ```
   # Server Configuration
   PORT=5000
   NODE_ENV=development

   # OpenAI API Configuration
   OPENAI_API_KEY=your_openai_api_key_here
   OPENAI_API_KEY_ROTATION_INTERVAL=30

   # Google Maps API Configuration
   GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
   GOOGLE_MAPS_API_KEY_ROTATION_INTERVAL=30

   # Security
   ENCRYPTION_KEY=your_encryption_key_here
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=100

   # Logging
   LOG_LEVEL=debug
   LOG_FILE_PATH=./logs/app.log
   
   # JWT Authentication
   JWT_SECRET=your_jwt_secret_here
   JWT_EXPIRATION=86400
   
   # SendGrid Email Configuration
   SENDGRID_API_KEY=your_sendgrid_api_key_here
   SENDGRID_FROM_EMAIL=noreply@yourdomain.com
   SENDGRID_VERIFICATION_TEMPLATE_ID=your_template_id
   SENDGRID_PASSWORD_RESET_TEMPLATE_ID=your_template_id
   SENDGRID_WELCOME_TEMPLATE_ID=your_template_id
   ```

### Getting API Keys

#### Google Maps API Key

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to APIs & Services > Library
4. Enable the following APIs:
   - Maps JavaScript API
   - Places API
   - Directions API
   - Geocoding API
5. Go to APIs & Services > Credentials
6. Click "Create credentials" and select "API key"
7. Copy your new API key
8. (Optional but recommended) Restrict the API key to the specific APIs you enabled
9. Update both `.env` files with your Google Maps API key

#### OpenAI API Key

1. Go to [OpenAI API](https://platform.openai.com/)
2. Sign up or log in to your account
3. Navigate to the API keys section
4. Create a new API key
5. Copy your API key and update the server `.env` file

### Running the Application

To run both the frontend and backend servers concurrently:

```
npm run dev
```

Or run them separately:

```
# Start the frontend
npm run start

# Start the backend
npm run server
```

The frontend will be available at http://localhost:3000 and the backend at http://localhost:5000.

## Troubleshooting

### Google Maps Issues

If you see the error "This page didn't load Google Maps correctly":

1. Check that your Google Maps API key is correctly set in the `.env` file
2. Make sure the key is not restricted to specific domains that exclude localhost
3. Verify that you've enabled all required Google Maps APIs in your Google Cloud Console
4. Check the browser console for specific error messages

### API Connection Issues

If you're having trouble connecting to the APIs:

1. Ensure your OpenAI API key is correctly set in the server `.env` file
2. Check that the server is running (`npm run server`)
3. Make sure the `REACT_APP_API_URL` in the frontend `.env` points to the correct server address

## License

This project is licensed under the MIT License - see the LICENSE.txt file for details.

## Project Structure

- `/.github`: GitHub Actions workflows
- `/build`: Production build output
- `/deployment`: Deployment configurations
- `/docs`: Project documentation
- `/public`: Static assets and service worker
  - `offline.html`: Offline fallback page
  - `service-worker.js`: Service worker for offline support
- `/scripts`: Build and maintenance scripts
- `/server`: Backend server code
  - `/middleware`: Express middleware
  - `/routes`: API route handlers
  - `/utils`: Server utility functions
- `/src`: Source code
  - `/api`: Legacy API functions (being migrated to core)
  - `/components`: Reusable UI components
  - `/contexts`: React contexts for state management
  - `/core`: Shared code across features
    - `/api`: API clients for external services 
    - `/components`: Shared UI components
    - `/services`: Shared application services
    - `/utils`: Utility functions and helpers
  - `/features`: Feature modules
    - `/map-visualization`: Map visualization feature
    - `/travel-planning`: Travel itinerary planning feature
    - `/user-profile`: User profile management feature
    - `/beta-program`: Beta program management
      - `/components`: Beta program components
        - `/analytics`: Analytics dashboard components
        - `/auth`: Authentication components
        - `/feedback`: Feedback collection components
        - `/onboarding`: User onboarding components
        - `/survey`: Survey creation and management components
      - `/services`: Beta program services
  - `/pages`: Main page components
  - `/services`: Legacy services (being migrated to core)
  - `/styles`: CSS and styling files
  - `/tests`: Component-specific tests
  - `/utils`: Utility functions
- `/tests`: End-to-end and integration tests

## Refactoring Philosophy

Throughout development, we've applied several key refactoring principles:

- **Code Consolidation**: Reducing duplication by centralizing common functionality
- **Parameter Standardization**: Consistent naming conventions across interfaces
- **Performance Optimization**: Regular improvements to frontend and backend performance
- **Security Hardening**: Progressive enhancement of security practices
- **Infrastructure Automation**: Continuous improvement of CI/CD processes

See `docs/project.refactors.md` for a detailed history of refactoring efforts and `docs/project.lessons.md` for lessons learned.

## Application Pages

1. **Chat Page**: Input travel preferences and generate personalized tour plans
2. **Map Page**: Visualize routes on an interactive map with nearby attractions
3. **User Profile Page**: View and manage saved routes
4. **Beta Portal**: Access point for beta testers with the following features:
   - **Onboarding**: Step-by-step setup for new beta users
   - **Feedback**: Submit feedback with screenshots and recordings
   - **Surveys**: Participate in and manage customizable surveys
   - **Analytics**: View usage metrics and insights (admin only)

## Technology Stack

- React
- React Router
- Material UI
- OpenAI API
- Google Maps API
- JWT Authentication
- SendGrid Email API
- Role-based Access Control (RBAC)
- Recharts for data visualization
- HTML2Canvas for screenshot capture

## Security Configuration

### Environment Setup

1. **Generate secure keys**:
   ```
   node scripts/generate-keys.js
   ```
   This will generate secure random keys for JWT_SECRET and ENCRYPTION_KEY.

2. **Copy and configure environment files**:
   ```
   cp .env.example .env
   cp server/.env.example server/.env
   ```
   Then update the `.env` files with your secure keys and API credentials.

3. **Verify .env files are git-ignored**:
   Ensure `.env` files are listed in `.gitignore` to prevent accidentally committing secrets.

### Security Best Practices

- Never commit `.env` files or any files containing secrets to version control
- Rotate API keys and secrets regularly
- Use strong passwords (minimum 12 characters) for all admin accounts
- In production, use a secrets manager service instead of environment files where possible
- For production deployment, use a secure vault service (AWS Secrets Manager, HashiCorp Vault, etc.)

