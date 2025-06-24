# Test Configuration Structure

This directory contains all the test configuration files organized by test framework and purpose. The structure is designed to provide a clear separation between different testing tools while allowing code reuse and consistent testing patterns.

## Directory Structure

```
tests/config/
├── jest/                        # Jest configurations
│   ├── backend.config.js        # Backend-specific Jest configuration
│   ├── frontend.config.js       # Frontend-specific Jest configuration
│   └── integration.config.js    # Integration test Jest configuration
│
├── mocks/                       # Mock files and utilities
│   ├── componentMocks.js        # Standardized React component mocks
│   ├── serviceMocks.js          # Service layer mocks for testing
│   └── svgMock.js              # SVG file mocks for Jest
│
├── fixtures/                    # Test data and fixtures
│   └── ...                     # Test data files
│
├── browserstack.config.js       # BrowserStack test configuration
├── playwright.config.js         # Playwright test configuration
├── integration-setup.js         # Integration test setup utilities
├── test-environment.js          # Custom test environment setup
└── README.md                   # This documentation
```

## Configuration Files

### Jest Configurations

#### frontend.config.js
**Purpose**: Configuration for frontend React component and unit tests  
**Features**:
- React Testing Library setup
- Component mock handling
- CSS and asset mocking
- Coverage reporting for frontend code
- Axios ES6/CommonJS compatibility fixes

#### backend.config.js
**Purpose**: Configuration for backend API and service tests  
**Features**:
- Node.js environment setup
- Database mocking and setup
- API endpoint testing utilities
- Service layer testing configuration

#### integration.config.js
**Purpose**: Configuration for end-to-end integration tests  
**Features**:
- Full application testing setup
- Database integration
- API integration testing
- Cross-service communication testing

### Mock Files

#### componentMocks.js
**Purpose**: Standardized mocks for React components  
**Contents**:
- Common component mocks (Navbar, Timeline, etc.)
- HOC (Higher-Order Component) mocks
- Third-party component library mocks
- Consistent mock implementations across tests

#### serviceMocks.js
**Purpose**: Comprehensive service layer mocks  
**Contents**:
- API service mocks
- Authentication service mocks
- Storage service mocks
- External service integration mocks

#### svgMock.js
**Purpose**: SVG file handling for Jest tests  
**Usage**: Automatically handles SVG imports in components during testing

### Browser Testing Configurations

#### browserstack.config.js
**Purpose**: BrowserStack cross-browser testing configuration  
**Features**:
- Multi-browser support
- Device testing capabilities
- BrowserStack integration settings

#### playwright.config.js
**Purpose**: Playwright end-to-end testing configuration  
**Features**:
- Cross-browser testing setup
- Headless/headed mode configuration
- Screenshot and video recording
- Test parallelization

### Utility Files

#### integration-setup.js
**Purpose**: Setup utilities for integration tests  
**Features**:
- Database seeding and cleanup
- Test environment initialization
- Service startup and teardown

#### test-environment.js
**Purpose**: Custom Jest test environment configuration  
**Features**:
- Environment variable setup
- Global test utilities
- Custom test lifecycle management

## Usage Patterns

### Running Jest Tests

The test configurations support different test environments:

```bash
# Frontend tests
npm run test:frontend
# Uses tests/config/jest/frontend.config.js

# Backend tests  
npm run test:backend
# Uses tests/config/jest/backend.config.js

# Integration tests
npm run test:integration
# Uses tests/config/jest/integration.config.js

# All tests
npm test
# Runs all test suites
```

### Environment-Based Configuration

Set the `JEST_ENV` environment variable to control which configuration is used:

```bash
# Explicit environment selection
JEST_ENV=frontend npm test
JEST_ENV=backend npm test  
JEST_ENV=integration npm test
```

### Mock Usage

Import mocks in your test files:

```javascript
// Component testing
import { mockNavbar, mockTimeline } from '../config/mocks/componentMocks';

// Service testing
import { mockAuthService, mockApiService } from '../config/mocks/serviceMocks';
```

### Cross-Browser Testing

#### Playwright Tests
```bash
# Run Playwright tests
npx playwright test --config=tests/config/playwright.config.js

# Run in headed mode for debugging
npx playwright test --headed
```

#### BrowserStack Tests
```bash
# Set credentials and run BrowserStack tests
BROWSERSTACK_USERNAME=your_username \
BROWSERSTACK_ACCESS_KEY=your_key \
npm run test:browserstack
```

## Test Stabilization Features

### Module Resolution
All Jest configurations include proper module resolution for:
- Axios ES6/CommonJS compatibility
- React component imports
- Service layer imports
- Static asset handling

### Coverage Configuration
Test coverage is configured to:
- Include source code directories
- Exclude test files and mocks
- Generate comprehensive coverage reports
- Maintain minimum coverage thresholds

### Performance Optimization
Configurations are optimized for:
- Fast test execution
- Parallel test running
- Efficient file watching
- Memory usage optimization

## Adding New Configurations

### Creating New Jest Configurations
1. Create a new configuration file in `tests/config/jest/`
2. Extend the base Jest configuration
3. Add environment-specific settings
4. Update package.json scripts if needed

### Adding New Mocks
1. Add mock implementations to appropriate mock files
2. Follow existing patterns for consistency
3. Document mock usage in comments
4. Update this README with new mock information

### Browser Testing Setup
1. Add new configuration files for specific browsers
2. Update test scripts in package.json
3. Document browser-specific requirements
4. Include setup instructions for CI/CD

## Troubleshooting

### Common Issues
- **Module Resolution**: Check `moduleNameMapper` in Jest configs
- **Mock Imports**: Verify mock file paths and exports
- **Coverage Issues**: Review coverage configuration in Jest settings
- **Browser Tests**: Ensure proper browser driver setup

### Debugging Tips
- Use `--verbose` flag for detailed test output
- Enable `--detectOpenHandles` to find resource leaks
- Use `--runInBand` for debugging test parallelization issues
- Check browser console logs for frontend test failures

## Related Documentation

- [Test Execution Results](../docs/project_lifecycle/all_tests/results/project.test-execution-results.md)
- [Test Patterns](../docs/project_lifecycle/all_tests/references/project.tests.test-patterns.md)
- [Mock Strategies](../docs/project_lifecycle/all_tests/references/project.tests.mock-strategies.md)
- [Test Organization](../docs/project_lifecycle/all_tests/references/project.test_organization.md)

---

**Last Updated**: Phase 8 Completion  
**Maintained By**: Testing Team  
**Review Schedule**: Updated when test configuration changes or new testing tools are added 