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

## Project Structure

```
TourGuideAI/
├── server/              # Backend server code
│   ├── routes/          # API routes
│   ├── models/          # Database models
│   ├── middleware/      # Express middleware
│   ├── services/        # Backend services
│   ├── utils/           # Utility functions
│   └── tests/           # Server-side tests
├── src/                 # Frontend source code
│   ├── api/             # API clients and interfaces
│   ├── components/      # Reusable UI components
│   ├── contexts/        # React context providers
│   ├── core/            # Core functionality and services
│   ├── data/            # Data utilities and storage
│   ├── features/        # Feature modules
│   ├── pages/           # Page components
│   ├── services/        # API interfaces
│   ├── styles/          # Global styles
│   ├── tests/           # Test files
│   ├── utils/           # Utility functions
│   ├── App.js           # Main application component
│   └── index.js         # Entry point
├── public/              # Public assets
├── tests/               # Test files
├── docs/                # Documentation
│   ├── project.document-inventory.md # Documentation inventory
│   ├── project.lessons.md # Project lessons learned
│   ├── technical/       # Technical documentation
│   ├── pics/            # Images for documentation
│   ├── prototype/       # Prototype data and mockups
│   └── project_lifecycle/ # Project management documentation
├── models/              # AI models and related resources
│   ├── data/            # Training data
│   ├── checkpoints/     # Model checkpoints
│   └── infra/           # Model infrastructure code
├── tourai_platform/     # TourAI platform specific code
│   ├── backend/         # Platform backend 
│   └── frontend/        # Platform frontend
└── tools/               # Development and deployment tools
```

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

### UX Audit and Testing

Test user experience with the UX audit system:
```
npm run test:ux-audit
```

## Deployment

### Staging

Automatically deployed from the `dev` branch:
```
npm run deploy:staging
```

### Production

Deployed from the `main` branch after approval:
```
npm run deploy:production
```

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

- [API Overview](API_OVERVIEW.md)
- [Architecture](ARCHITECTURE.md)
- [Security](SECURITY.md)
- [Contributing](CONTRIBUTING.md)
- [UX Audit System](docs/project_lifecycle/knowledge/project.lessons.md#ux-audit-system)
- [Documentation Inventory](docs/project.document-inventory.md)
- [Project Lessons](docs/project_lifecycle/knowledge/project.lessons.md)
- [Stability Test Plan](docs/project_lifecycle/all_tests/plans/project.tests.frontend-plan.md)
- [Deployment Pipeline](docs/project_lifecycle/deployment/pipelines/project.deployment-pipeline.md)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- OpenAI for the GPT models
- Google Maps for mapping functionality
- Contributors and beta testers

