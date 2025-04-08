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
├── src/                 # Frontend source code
│   ├── components/      # Reusable UI components
│   ├── context/         # React context providers
│   ├── features/        # Feature modules
│   │   ├── auth/        # Authentication
│   │   ├── beta-program/ # Beta program components and services
│   │   ├── map/         # Map visualization
│   │   ├── tours/       # Tour generation and management
│   │   └── translation/ # Translation services
│   ├── hooks/           # Custom React hooks
│   ├── pages/           # Page components
│   ├── services/        # API interfaces
│   ├── styles/          # Global styles
│   ├── utils/           # Utility functions
│   └── App.js           # Main application component
├── public/              # Public assets
├── tests/               # Test files
├── docs/                # Documentation
│   ├── api/             # API documentation
│   ├── technical/       # Technical documentation
│   ├── user-guides/     # User guides
│   └── pics/            # Images for documentation
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

- Follow the [JavaScript Style Guide](docs/javascript-style-guide.md)
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

- [API Documentation](docs/api/README.md)
- [Technical Documentation](docs/technical/README.md)
- [User Guides](docs/user-guides/README.md)
- [Development Setup](docs/development-setup.md)
- [UX Audit System](docs/technical/ux-audit-system.md)
- [Task Prompt System](docs/technical/task-prompt-system.md)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- OpenAI for the GPT models
- Google Maps for mapping functionality
- Contributors and beta testers

