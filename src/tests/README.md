# TourGuideAI Frontend Test Suite

This directory contains all frontend-specific tests for the TourGuideAI application, organized by component and feature type.

## Directory Structure

```
src/tests/
├── components/           # Component tests
│   ├── api/              # API-related component tests
│   │   └── ApiStatus.test.js
│   ├── analytics/        # Analytics component tests
│   ├── onboarding/       # Onboarding component tests 
│   ├── router/           # Routing component tests
│   │   └── RouterStructure.test.js
│   ├── survey/           # Survey component tests
│   ├── theme/            # Theme-related component tests
│   │   └── ThemeProvider.test.js
│   ├── travel-planning/  # Travel planning component tests
│   └── ui/               # UI component tests
│       └── Timeline.test.js
├── integration/          # Integration tests
├── beta-program/         # Beta program feature tests
│   ├── task-prompt/      # Task prompt system tests
│   └── ux-audit/         # UX audit system tests
└── stability/            # Stability tests
```

## Test Categories

### Component Tests

Tests for individual React components, ensuring they render correctly, handle props properly, and perform their expected functions in isolation.

### Integration Tests

Tests for interactions between multiple components, ensuring they work together properly.

### Beta Program Tests

Tests for beta program features like surveys, task prompts, and UX audit systems.

### Stability Tests

Tests for the stability and reliability of frontend features under various conditions.

## Running Tests

### All Frontend Tests

```bash
npm test
```

### Component Tests

```bash
npm test src/tests/components
```

### Specific Component Group

```bash
npm test src/tests/components/theme
```

### Integration Tests

```bash
npm test src/tests/integration
```

### Beta Program Tests

```bash
npm run test:ux-audit  # UX Audit feature tests
npm run test:task-prompt  # Task Prompt feature tests
```

## Contributing to Frontend Testing

When adding new frontend tests:

1. Place the test file in the appropriate subdirectory based on component type or feature
2. Follow the naming convention: `ComponentName.test.js`
3. Use React Testing Library and Jest for tests
4. Write both unit tests and integration tests as appropriate
5. Ensure tests are independent and don't rely on global state

## Relationship with Main Test Suite

This frontend test suite complements the main test suite in the `/tests` directory. While this directory focuses on unit and component tests, the main suite contains end-to-end and cross-browser tests. 