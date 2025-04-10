# Test Organization Reference

## Directory Structure

The TourGuideAI project organizes its tests in a structured manner, following the principle of categorization by test type rather than by feature. This approach improves discoverability and maintenance of tests.

```
docs/project_lifecycle/
└── all_tests/                # Parent directory for all test related content
    ├── results/              # Test execution results and reports
    │   ├── data/             # Raw test result data in JSON format
    │   └── reports/          # Generated HTML reports
    ├── plans/                # Test planning documents
    └── references/           # Reference documents for testers
```

## Key Organization Principles

1. **Type-Based Organization**: Tests are organized by type (stability, security, load) rather than by feature
2. **Centralized Configuration**: Test configurations are stored in a dedicated directory
3. **Comprehensive Documentation**: Each test category includes its own documentation
4. **Standardized Directory Structure**: Consistent structure across test categories for improved developer experience
5. **Logical Feature Categories**: Component tests are organized by logical feature groupings

## Test Categories

The project includes the following test categories:

1. **Core-App Tests**: Tests for the core application functionality
   - Page components
   - Core features
   - Stability tests

2. **Beta-Program Tests**: Tests for functionality specific to the beta program
   - Survey components
   - Analytics
   - Onboarding

3. **Travel-Planning Tests**: Tests for the travel planning functionality
   - Route generation
   - Route management
   - Waypoints and timeline features

4. **Server Tests**: Tests for server-side functionality
   - API endpoints
   - Database interactions
   - Authentication

## Best Practices

1. Use consistent naming conventions for test files (e.g., `*.test.js`)
2. Create specific README files for each test category
3. Use recursive glob patterns when searching for tests
4. Update related scripts when reorganizing test files
5. Document test directory structures for better comprehension
6. Keep test scripts abstracted from implementation details

## Scripts

Test-related scripts are stored in the `scripts/` directory at the project root:

- `run-stability-tests.js`: Runs stability tests across all categories
- `run_syncservice_test.ps1`: PowerShell script for testing the SyncService
- `generate-test-report.js`: Generates HTML reports from test results
- And more

## Documentation

Test documentation follows these principles:

1. Each test category has its own documentation
2. Test results are saved in the `results/` directory
3. Test plans are stored in the `plans/` directory
4. References and guides are kept in the `references/` directory

---

*Last Updated: 2025-04-10* 