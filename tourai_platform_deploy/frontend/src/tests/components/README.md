# Component Tests

This directory contains tests for individual React components in the TourGuideAI application, organized by component type.

## Directory Structure

```
components/
├── api/                # API-related component tests
│   ├── ApiStatus.test.js
│   └── README.md
├── analytics/          # Analytics component tests
│   └── README.md
├── onboarding/         # Onboarding component tests 
│   └── README.md
├── router/             # Routing component tests
│   ├── RouterStructure.test.js
│   └── README.md
├── survey/             # Survey component tests
│   └── README.md
├── theme/              # Theme-related component tests
│   ├── ThemeProvider.test.js
│   └── README.md
├── travel-planning/    # Travel planning component tests
│   └── README.md
└── ui/                 # UI component tests
    ├── Timeline.test.js
    └── README.md
```

## Component Categories

### API Components
Components related to API status, loading states, and data fetching.

### Analytics Components
Components for data visualization, charts, and analytics dashboards.

### Onboarding Components
Components for user onboarding flows and tutorials.

### Router Components
Components handling application routing and navigation.

### Survey Components
Components for user feedback collection and survey interfaces.

### Theme Components
Components for theme management, styling, and visual consistency.

### Travel Planning Components
Components specific to the travel planning features.

### UI Components
General UI components like buttons, forms, modals, and layout elements.

## Running Component Tests

### All Component Tests

```bash
npm test src/tests/components
```

### Specific Component Category

```bash
npm test src/tests/components/ui
```

### Single Component Test

```bash
npm test src/tests/components/ui/Timeline.test.js
```

## Testing Approach

Component tests focus on:

1. **Rendering** - Verifying components render correctly with different props
2. **User Interactions** - Testing click handlers, form submissions, etc.
3. **State Changes** - Ensuring component state updates correctly
4. **Prop Validation** - Testing components with various prop combinations
5. **Edge Cases** - Testing empty states, loading states, error states, etc.

## Adding New Component Tests

When adding new component tests, follow these guidelines:

1. Place the test in the appropriate category directory
2. Name the test file to match the component: `ComponentName.test.js`
3. Use React Testing Library patterns
4. Test component behavior, not implementation details
5. Mock external dependencies as needed 