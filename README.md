# TourGuideAI

TourGuideAI is an intelligent virtual tour guide application that uses AI to create personalized travel experiences.

## Features

- **Dynamic Tour Generation**: Creates customized tour routes based on user preferences
- **Real-time Translation**: Translates signs, menus, and conversations
- **Historical Context**: Provides historical information about landmarks and sites
- **Local Insights**: Offers insider tips and hidden gems
- **Accessibility Options**: Features for users with visual, hearing, or mobility impairments
- **Augmented Reality**: Overlays historical images and information
- **Offline Mode**: Core functionality available without internet connection
- **Interactive Map**: Visual representation of tour routes and points of interest
- **User Analytics**: Insights into user behavior and preferences
- **Beta Program**: Early access program with feedback collection and user testing
  - Comprehensive onboarding workflow
  - Feature request system with voting
  - Customizable survey system
  - UX audit system with session recording and heatmaps
  - Task prompt system for guided beta testing
  - Issue prioritization system
- **Global Content Delivery**: Fast and reliable content access worldwide with CDN integration
- **Monetization**: Subscription-based access with tiered pricing plans

## 🚀 MVP Quick Start (5 minutes to deploy)

**For rapid deployment and testing**, use our simplified MVP version with only essential features:
- ✅ JWT Authentication
- ✅ OpenAI Chat Integration  
- ✅ Google Maps Integration
- ✅ Basic User Profile
- ✅ Responsive Material-UI design

### Prerequisites for MVP

1. **API Keys Required:**
   - [OpenAI API Key](https://platform.openai.com/api-keys)
   - [Google Maps API Key](https://developers.google.com/maps/gmp-get-started)

2. **Node.js** (v16 or higher)

### MVP Setup Instructions

#### 1. Activate MVP Branch
```bash
git checkout mvp-release
```

#### 2. Install Dependencies
```bash
npm install
```

#### 3. Environment Configuration
Create a `.env` file in the root directory:
```env
# TourGuide AI MVP Environment Configuration
OPENAI_API_KEY=your_openai_api_key_here
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
JWT_SECRET=your_super_secure_jwt_secret_here_minimum_32_characters
PORT=3001
NODE_ENV=production

# Demo Account (CHANGE IN PRODUCTION)
DEMO_EMAIL=demo@example.com
DEMO_PASSWORD=demo123

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Cache Configuration
CACHE_TTL=3600000
```

#### 4. Build and Start
```bash
npm run build
npm run server
```

Your MVP app will be available at: `http://localhost:3001`

### 🌐 MVP Deployment Options

#### Option 1: Heroku (Recommended)
```bash
heroku login
heroku create your-tourguide-app
heroku config:set OPENAI_API_KEY=your_key
heroku config:set GOOGLE_MAPS_API_KEY=your_key
heroku config:set JWT_SECRET=your_secret
heroku config:set NODE_ENV=production
git push heroku mvp-release:main
```

#### Option 2: Railway
1. Connect GitHub repo to Railway
2. Set environment variables in dashboard
3. Deploy automatically

#### Option 3: DigitalOcean App Platform
1. Connect GitHub repo
2. Build command: `npm run build`
3. Run command: `npm run server`
4. Set environment variables

### 🔐 MVP Default Test Account
- **Email:** demo@example.com
- **Password:** demo123

### 🔄 Switching Back to Full Version
```bash
git checkout main
# Full version automatically restored
npm install  # Reinstall full dependencies
```

### 🔧 What's Removed in MVP

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

### ✅ What's Included in MVP

- ✅ Simple JWT authentication
- ✅ OpenAI chat integration
- ✅ Google Maps integration
- ✅ Basic user profiles
- ✅ Responsive Material-UI design
- ✅ Core routing (Home, Chat, Map, Profile)

### 📝 MVP Post-Deployment Steps

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

### 🆘 MVP Troubleshooting

#### Common Issues:

1. **"Cannot GET /" error:**
   - Make sure you're using the MVP server: `node server/mvp-server.js`

2. **API Key errors:**
   - Verify your environment variables
   - Check API key permissions

3. **Build errors:**
   - Delete `node_modules` and `package-lock.json`
   - Run `npm install` again

#### Support

If you need help with deployment:
1. Check the console logs for error messages
2. Verify all environment variables are set
3. Test locally first before deploying

## Getting Started

### Prerequisites

- Node.js 16+
- npm 7+
- MongoDB 4+
- Google Maps API key
- OpenAI API key

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/tourguideai.git
   cd tourguideai
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Set up environment variables:
   ```
   cp .env.example .env
   ```
   Edit the `.env` file with your API keys and configuration.

4. Start the development server:
   ```
   npm run dev
   ```

### API Configuration and Token Access

#### Environment Variables Template

For full development setup, create a `.env` file with the following configuration:

```env
# TourGuide AI Full Development Configuration

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Google Maps Configuration  
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here

# Authentication
JWT_SECRET=your_super_secure_jwt_secret_here_minimum_32_characters

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/tourguideai
DATABASE_NAME=tourguideai

# Server Configuration
PORT=3001
NODE_ENV=development

# Translation Service
DEEPL_API_KEY=your_deepl_api_key_here

# Email Configuration (for full version)
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Cache Configuration
CACHE_TTL=3600000
REDIS_URL=redis://localhost:6379

# File Upload Configuration
MAX_FILE_SIZE=5242880
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif

# Analytics (optional)
GOOGLE_ANALYTICS_ID=your_ga_id_here
```

#### Getting API Keys

##### Google Maps API
1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to "APIs & Services" > "Dashboard"
4. Click "+ ENABLE APIS AND SERVICES"
5. Search for and enable the following APIs:
   - Maps JavaScript API
   - Places API
   - Directions API
   - Geocoding API
6. Go to "APIs & Services" > "Credentials"
7. Click "Create credentials" > "API key"
8. Restrict the API key to the APIs listed above
9. Copy the API key to your `.env` file

##### OpenAI API
1. Go to [OpenAI's website](https://platform.openai.com/)
2. Sign up or log in to your account
3. Navigate to the API section
4. Create a new API key
5. Copy the API key to your `.env` file
6. Set up billing to ensure API access

##### Translation Service API (Optional)
1. Go to the [DeepL API portal](https://www.deepl.com/pro-api)
2. Sign up for a developer account
3. Navigate to your account dashboard
4. Create a new API key
5. Copy the API key to your `.env` file

##### JWT Secret Generation
Generate a secure random string (minimum 32 characters):
```bash
# Using OpenSSL
openssl rand -base64 32

# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

#### Setting up API and tokens
1. Set up API tokens:
   ```
   npm run setup:tokens
   ```

2. Configure API access:
   ```
   npm run configure:api
   ```

3. Verify API configuration:
   ```
   npm run verify:api
   ```
   This will check if all required API endpoints are accessible.

4. Generate access tokens for development:
   ```
   npm run generate:dev-tokens
   ```
   These tokens are valid for 7 days and are required for local development.

#### Security Notes

- **Never commit your .env file to version control**
- Change the demo account credentials in production
- Use strong, unique passwords and secrets
- Regularly rotate your API keys
- Enable API key restrictions and monitoring
- Use environment-specific configurations for different deployment stages

## Project Structure

```
TourGuideAI/
├── server/              # Backend server code
│   ├── clients/         # External API clients
│   ├── config/          # Server configuration
│   ├── coverage/        # Test coverage reports
│   ├── middleware/      # Express middleware
│   ├── models/          # Database models
│   ├── public/          # Static server assets
│   ├── routes/          # API routes
│   ├── scripts/         # Server utility scripts
│   ├── services/        # Backend services
│   ├── tests/           # Server-side tests
│   ├── utils/           # Utility functions
│   └── vault/           # Secure configuration storage
├── src/                 # Frontend source code
│   ├── __mocks__/       # Jest mocks
│   ├── api/             # API clients and interfaces
│   ├── components/      # Reusable UI components
│   ├── config/          # Frontend configuration
│   ├── contexts/        # React context providers
│   ├── core/            # Core functionality and services
│   ├── features/        # Feature modules (beta-program, map-visualization, travel-planning, user-profile)
│   ├── pages/           # Page components
│   ├── services/        # Frontend services
│   ├── styles/          # Global styles
│   ├── tests/           # Frontend test files
│   ├── utils/           # Utility functions
│   ├── App.js           # Main application component
│   └── index.js         # Entry point
├── tests/               # End-to-end and integration tests
│   ├── config/          # Test configuration
│   ├── cross-browser/   # Cross-browser testing
│   ├── integration/     # Integration tests
│   ├── load/            # Load testing
│   ├── security/        # Security tests
│   ├── smoke/           # Smoke tests
│   ├── stability/       # Stability tests
│   └── user-journey/    # User journey tests
├── scripts/             # Development and deployment scripts
│   └── utils/           # Script utilities
├── docs/                # Documentation
│   ├── pics/            # Images and screenshots
│   ├── project_lifecycle/ # Project management docs (all_tests, deployment, knowledge, etc.)
│   └── prototype/       # Prototype data and mockups
├── deployment/          # Deployment configurations
│   └── production/      # Production deployment files
├── logs/                # Application logs
├── patches/             # Code patches
└── public/              # Public frontend assets
```

## Development Workflow

### Branch Structure

- `main`: Production-ready code
- `dev`: Development branch for integration
- `feature/*`: Feature branches

### Pull Request Process

1. Create a feature branch from `dev`
2. Make your changes
3. Run tests: `npm test`
4. Update documentation if necessary
5. Create a pull request to `dev`
6. Get approval from at least one reviewer
7. Merge to `dev`

### Code Standards

- Follow the [JavaScript Style Guide](docs/project_lifecycle/knowledge/project.lessons.md#javascript-style-guide)
- Write tests for all new features
- Maintain code coverage above 80%
- Use TypeScript for type safety

## Project Phases

The project is organized into multiple development phases:

1. **Initial Setup and Prototype** - ✅ Completed (March 2025)
2. **API Architecture** - ✅ Completed (March 2025)
3. **Real API Integration** - ✅ Completed (March 2025)
4. **Production Integration** - ✅ Completed (March 2025)
5. **Performance Optimization & Production Readiness** - ✅ Completed (March 2025)
6. **Beta Release & User Feedback** - ✅ Completed (April 2025)
7. **Post-Beta Enhancements** - ⏭️ Skipped
8. **Online Launch** - 🚀 In Progress (Started April 2025)
   - Global deployment infrastructure
   - CDN implementation for worldwide content delivery
   - Security hardening and compliance
   - Customer support infrastructure
   - Monetization strategy implementation

### Current Version

**Current Version:** 1.0.0-RC1 (May 30, 2025)

TourGuideAI follows semantic versioning (MAJOR.MINOR.PATCH) as defined in our [Version Control Documentation](docs/project_lifecycle/version_control/references/version-control.md).

The project is currently in Release Candidate stage, preparing for the official 1.0.0 release scheduled for August 2025.

For detailed release plans, see our [1.0.0 Release Candidate 2 Plan](docs/project_lifecycle/version_control/records/project.rc2.1.0.0.release-plan.md).

## Testing Strategy

### Unit Tests

Test individual components and functions in isolation:
```
npm run test:unit
```

### Integration Tests

Test interactions between components and services:
```
npm run test:integration
```

### End-to-End Tests

Test complete user flows:
```
npm run test:e2e
```

### User Journey Tests

Simulate realistic user personas interacting with the application:
```
npm run test:user-journeys
```

TourGuideAI implements comprehensive user journey tests for different personas:
- Sarah (Casual Tourist) - Weekend city exploration
- Michael (History Enthusiast) - Historical deep dive
- Elena (Family Traveler) - Family-friendly travel
- James (Business Traveler) - Business trip with limited free time
- Tanya (Adventure Seeker) - Active outdoor exploration

All user journey tests are now passing with 100% success rate as of May 2025.

### UX Audit and Testing

Test user experience with the UX audit system:
```
npm run test:ux-audit
```

### Overall Testing

#### Prerequisites

Before running the test scripts, ensure you have the following:

1. Node.js and npm installed
2. All project dependencies installed (`npm install`)
3. Appropriate permissions to run scripts on your system

#### Windows Setup

##### Setting Up PowerShell Scripts

PowerShell scripts may be blocked from running due to execution policies. To enable running the scripts:

1. Open PowerShell as Administrator
2. Set the execution policy to allow running the scripts:
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```
3. Alternatively, run the scripts with the `-ExecutionPolicy Bypass` parameter:
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\scripts\run-all-tests.ps1
   ```
- ⏸️ **Staging Deployment**: Automatically skipped 

#### Unix/Linux/macOS Setup

##### Making Scripts Executable

Before running bash scripts, you need to make them executable:

```bash
chmod +x scripts/run-all-tests.sh
chmod +x tests/*.sh  # If you have any other scripts in the tests directory
```

Then you can run them:
```bash
./scripts/run-all-tests.sh
```

### Troubleshooting Common Issues

#### Scripts Not Found

If you receive "file not found" errors when trying to run scripts:

1. Check that you are in the project root directory
2. Verify that the scripts exist in the specified paths
3. Use the full path to the script:
   ```
   C:\full\path\to\TourGuideAI\scripts\run-all-tests.bat
   ```

#### Permission Denied

If you receive "permission denied" errors:

**Windows:**
1. Right-click on the script file
2. Select Properties
3. Click the "Unblock" button if it's available
4. Click Apply and OK

**Unix/Linux/macOS:**
```bash
chmod +x <script_file>
```

#### Script Execution Failed

If scripts fail to run properly:

1. Check for syntax errors in the script
2. Ensure you have the required environment variables set
3. Verify that Node.js and npm are in your PATH
4. Try running with administrator privileges

### Additional Notes

- The test scripts will create a `test-results` directory in the project root to store test reports
- If you customize the scripts, ensure you maintain proper paths and error handling
- For CI/CD integration, use the appropriate script for your platform in your CI pipeline 

## Deployment

TourGuideAI uses a comprehensive multi-environment deployment strategy supporting development, staging, and production environments.

### Deployment Strategy

We maintain two deployment approaches:

1. **Simple Deployment** (`scripts/deploy.sh`) - For development and staging environments
2. **Production Deployment** (`deployment/production/`) - Enterprise-grade Docker-based deployment

For detailed information, see our [Deployment Strategy](docs/project_lifecycle/deployment/plans/project.deployment-strategy.md).

### Infrastructure Status

⚠️ **Current Status**: Infrastructure **not ready for deployment**

**Automatic CI/CD Behavior**:
- ✅ **Build & Test**: All tests run successfully
- ⏸️ **Staging Deployment**: Automatically skipped (infrastructure not configured)
- ⏸️ **Production Deployment**: Automatically skipped (infrastructure not configured)
- 🎭 **Mock Testing**: Simulation tests run when real environments aren't available

**Missing Infrastructure Components**:
- AWS account with S3, CloudFront, IAM setup
- Domain registration (`tourguideai.com`)
- SSL certificate configuration
- GitHub Secrets for deployment credentials

**Infrastructure Readiness: 0%** - No production infrastructure is currently provisioned.

### Development Environment

For local development and testing:
```bash
npm run dev
```

### Staging Deployment

Automatically deployed from the `dev` branch (requires infrastructure setup):
```bash
npm run deploy:staging
```

### Production Deployment

Enterprise-grade deployment from the `main` branch (requires complete infrastructure):
```bash
npm run deploy:production
```

### Related Documentation

**Infrastructure & Deployment**:
- [Infrastructure Awareness Guide](.github/workflows/INFRASTRUCTURE_AWARENESS.md) - How CI/CD adapts to infrastructure availability
- [Deployment Strategy](docs/project_lifecycle/deployment/plans/project.deployment-strategy.md) - Overview of deployment approaches
- [Deployment Preparation Checklist](docs/project_lifecycle/deployment/plans/project.deployment-preparation-checklist.md) - Complete infrastructure requirements
- [Testing Improvements](.github/workflows/TESTING_IMPROVEMENTS.md) - GitHub Actions testing enhancements

**Implementation Plans**:
- [CDN Implementation Plan](docs/project_lifecycle/deployment/plans/project.cdn-implementation-plan.md) - Global content delivery setup
- [Deployment Pipeline](docs/project_lifecycle/deployment/plans/project.deployment-pipeline-plan.md) - CI/CD pipeline configuration

## Analytics and Monitoring

- Google Analytics for user behavior
- Sentry for error tracking
- Custom analytics dashboard for feature usage
- UX audit system for user interaction analysis

## Accessibility

The application follows WCAG 2.1 AA guidelines:

- Keyboard navigation support
- Screen reader compatibility
- Color contrast compliance
- Alternative text for images
- Focus management

## Security

- JWT for authentication
- API rate limiting
- Input validation
- CSRF protection
- Regular security audits

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on contributing to the project.

## Documentation

### Core Documentation
- [API Overview](API_OVERVIEW.md)
- [Architecture](ARCHITECTURE.md)
- [Security](SECURITY.md)
- [Contributing](CONTRIBUTING.md)

### Deployment Documentation
- [Deployment Strategy](docs/project_lifecycle/deployment/plans/project.deployment-strategy.md) - Deployment approach overview
- [Deployment Preparation Checklist](docs/project_lifecycle/deployment/plans/project.deployment-preparation-checklist.md) - Infrastructure requirements
- [CDN Implementation Plan](docs/project_lifecycle/deployment/plans/project.cdn-implementation-plan.md) - Global content delivery setup
- [Deployment Pipeline Plan](docs/project_lifecycle/deployment/plans/project.deployment-pipeline-plan.md) - CI/CD configuration
- [Performance Implementation Plan](docs/project_lifecycle/deployment/plans/project.performance-implementation-plan.md) - Code splitting and optimization
- [Performance Optimization Plan](docs/project_lifecycle/deployment/plans/project.performance-optimization-plan.md) - Performance strategy

### Testing Documentation
- [Frontend Test Plan](docs/project_lifecycle/all_tests/plans/project.tests.frontend-plan.md)
- [Backend Test Plan](docs/project_lifecycle/all_tests/plans/project.tests.backend-plan.md)

### Project Management
- [UX Audit System](docs/project_lifecycle/knowledge/project.lessons.md#ux-audit-system)
- [Documentation Inventory](docs/project.document-inventory.md)
- [Project Lessons](docs/project_lifecycle/knowledge/project.lessons.md)
- [Project Workflows](.cursor/.workflows)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- OpenAI for the GPT models
- Google Maps for mapping functionality
- Contributors and beta testers