# GitHub Workflows

This directory contains GitHub Actions workflows used to automate tasks in the TourGuideAI project.

## Available Workflows

### CI/CD Workflows

- **ci.yml**: Main continuous integration workflow that runs on pull requests and pushes to main.
  - Runs unit tests, linting, and build validation
  - Includes UX Audit System component testing
  - Validates Task Prompt System integration
  - Generates code coverage reports

- **deployment.yml**: Handles deployment to different environments.
  - Stages: dev, staging, production
  - Includes post-deployment verification
  - Validates UX audit recording functionality in each environment

### Code Quality Workflows

- **lint.yml**: Runs linting checks on JavaScript and TypeScript files.
  - Uses ESLint with our custom rule set
  - Validates component structure and best practices
  - Includes specific rules for UX Audit components
  - Validates Task Prompt accessibility patterns

- **test.yml**: Runs all test suites.
  - Unit tests with Jest
  - Integration tests with Playwright
  - Stability tests for critical components
  - Dedicated UX Audit System tests to ensure recording and visualization reliability
  - Task Prompt System tests to verify user guidance functionality

### Documentation Workflows

- **docs.yml**: Builds and deploys documentation.
  - Generates API documentation
  - Builds technical documentation site
  - Includes UX Audit System and Task Prompt System documentation
  - Validates code examples in documentation

### Specific Feature Workflows

- **ux-audit-validation.yml**: Runs specialized tests for the UX Audit System.
  - Validates session recording functionality
  - Tests heatmap visualization with various data inputs
  - Ensures UX metrics calculations are accurate
  - Checks export functionality and data integrity
  - Tests integration with analytics dashboard

- **task-prompt-testing.yml**: Validates the Task Prompt System.
  - Tests prompt appearance and timing
  - Validates multi-step task guidance
  - Ensures proper state management across tasks
  - Tests integration with UX audit recording
  - Verifies task completion analytics

## Running Workflows Locally

You can run these workflows locally using [act](https://github.com/nektos/act).

```bash
# Install act
brew install act

# Run the CI workflow
act -j build

# Run UX Audit validation workflow
act -j ux-audit-validation

# Run Task Prompt testing workflow
act -j task-prompt-testing
```

## Creating New Workflows

When creating new workflows:

1. Use our workflow templates in `.github/workflow-templates/`
2. Follow naming conventions: `<feature>-<action>.yml`
3. Include appropriate triggers and conditions
4. Add adequate documentation in this README

### Adding UX Audit System Tests to Workflows

When adding UX Audit System tests to workflows:

```yaml
jobs:
  ux-audit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - name: Run UX Audit System tests
        run: npm run test:ux-audit
      - name: Generate UX test report
        run: npm run report:ux-audit
      - name: Upload test artifacts
        uses: actions/upload-artifact@v3
        with:
          name: ux-audit-test-results
          path: test-results/ux-audit
```

### Adding Task Prompt System Tests to Workflows

When adding Task Prompt System tests to workflows:

```yaml
jobs:
  task-prompt-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - name: Run Task Prompt System tests
        run: npm run test:task-prompt
      - name: Generate Task Prompt test report
        run: npm run report:task-prompt
      - name: Upload test artifacts
        uses: actions/upload-artifact@v3
        with:
          name: task-prompt-test-results
          path: test-results/task-prompt
```

## Workflow Dependencies

Some workflows depend on specific environment variables or secrets:

- `API_KEY`: Used for deployment and integration tests
- `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`: Used for AWS deployments
- `UX_AUDIT_SERVICE_URL`: URL for the UX Audit backend service
- `TASK_PROMPT_API_KEY`: API key for Task Prompt service integration

## Best Practices

- Keep workflows focused on a single responsibility
- Use job dependencies for complex workflows
- Store sensitive data in GitHub Secrets
- Use specific versions for GitHub Actions
- Add descriptive comments to complex steps
- Configure proper timeout settings for long-running jobs
- Add proper error handling and notifications
- Include UX Audit and Task Prompt validations in critical workflows

## Workflows

### CI/CD Pipeline (`ci-cd.yml`)

This workflow is responsible for the continuous integration and deployment of the TourGuideAI application.

#### Key Features:
- Builds and tests the application on every push and pull request
- Deploys to staging for develop and release branches
- Deploys to production for the main branch
- Runs smoke tests after deployment
- Performs frontend stability checks to prevent common React issues
- Executes key stability tests and stores results as artifacts

#### Environment Variables:
- `DISABLE_ESLINT_PLUGIN`: Set to "true" to bypass ESLint checks during the build process, which helps when there are linting errors that shouldn't block deployment.

#### Frontend Stability Checks:
The workflow includes automated checks to prevent common React frontend issues:
- Router nesting verification - Prevents nested Router components that cause runtime errors
- Theme Provider validation - Ensures Material UI components are properly themed
- ESLint global declarations - Verifies proper handling of global variables like Google Maps

#### Stability Tests:
The CI/CD workflow now includes essential stability tests:
- Runs critical frontend stability tests
- Tests backend resilience using the ApiStatus component
- Executes tests to verify proper API integration
- Generates and stores test reports in a standardized format
- Test results are stored as artifacts for later analysis

### Stability Tests (`stability-tests.yml`)

The stability testing workflow performs comprehensive tests to ensure application stability:

- **Triggers**: 
  - Weekly schedule (Wednesdays at midnight)
  - Pull requests with changes to src files, tests, or configuration
  - Manual workflow dispatch
- **Tests**:
  - Frontend stability tests for component architecture
  - Critical component tests (ProfilePage, ChatPage, MapPage)
  - Backend resilience tests to verify graceful degradation
  - API integration tests for external services
- **Features**:
  - Detailed console output for each test step
  - Automatic generation of comprehensive test reports
  - Storage of test results as artifacts
  - GitHub step summary with test result overview
- **Output**:
  - Test results stored in `docs/project_lifecycle/all_tests/records/test-results/`
  - JSON-formatted test reports with detailed metrics
  - Artifacts preserved for 30 days for historical analysis

### Security Scanning (`security-scan.yml`)

The security scanning workflow performs automated security checks:

- **Triggers**: 
  - Weekly schedule (Mondays at 2 AM)
  - Push to main branch and release-* branches
  - Workflow dispatch
- **Scans**:
  - SBOM generation (CycloneDX and Syft)
  - npm audit for vulnerable dependencies
  - Snyk and Trivy for vulnerability scanning
  - ESLint security plugins for static code analysis
  - GitLeaks for secret scanning
  - Dependency confusion checking
  - Package.json security audit
  - NodeJsScan for Node.js-specific security issues
  - OWASP ZAP baseline scan for web vulnerabilities
  - License compliance scanning with FOSSA
- **Reporting**:
  - Uploads scan results as artifacts
  - Publishes SARIF reports to GitHub Security tab
  - Creates GitHub issues for critical findings
  - Provides detailed reports in various formats

### Branch Protection (`branch-protection.yml`)

The branch protection workflow manages protection rules for critical branches:

- **Triggers**: Weekly schedule (Mondays at midnight), workflow dispatch
- **Features**:
  - Enforces strong protection for main branch
  - Configures standard protection for develop branch
  - Sets up pattern-based protection for release-* branches
  - Requires code reviews and status checks
  - Enforces admin rules

### End-to-End Tests (`e2e-tests.yml`)

The end-to-end testing workflow runs comprehensive browser tests:

- **Triggers**: 
  - Scheduled (Monday and Thursday at midnight)
  - Pull requests to main, develop, and release-* branches
  - Manual workflow dispatch
- **Features**:
  - Playwright-based end-to-end testing
  - Full application startup and testing
  - Artifact generation for reports and screenshots
  - Publishes test results

### Dependency Updates (`dependency-updates.yml`)

The dependency update workflow handles automatic package updates:

- **Triggers**: Weekly schedule (Mondays at midnight), workflow dispatch
- **Features**:
  - Automated dependency scanning and updates
  - Support for grouping related dependencies
  - Special handling for release branches
  - Separate configuration for npm and GitHub Actions

## Configuration Files

- `eslint-security.json` - ESLint configuration for security scanning
- `zap-rules.tsv` - Rules for OWASP ZAP scanning
- `dependabot.yml` - Dependabot configuration for automated updates
- `CODEOWNERS` - Code ownership patterns for automated review assignments

## Usage

### Running Workflows Manually

Any workflow can be manually triggered through the GitHub Actions UI:

1. Go to the repository on GitHub
2. Navigate to Actions tab
3. Select the workflow to run
4. Click "Run workflow" button
5. Specify branch and parameters if needed

### Security Scan Artifacts

After a security scan completes, artifacts are available for download:

1. Go to the workflow run in GitHub Actions
2. Scroll to the Artifacts section
3. Download the security-scan-reports artifact

## Environment Variables

The following secrets need to be configured in GitHub repo settings:

- `ADMIN_GITHUB_TOKEN` - GitHub token with admin permissions for branch protection
- `AWS_ROLE_TO_ASSUME_STAGING` - AWS IAM role ARN for staging deployments
- `AWS_ROLE_TO_ASSUME_PRODUCTION` - AWS IAM role ARN for production deployments
- `STAGING_CLOUDFRONT_ID` - CloudFront distribution ID for staging
- `PRODUCTION_CLOUDFRONT_ID` - CloudFront distribution ID for production
- `SNYK_TOKEN` - Snyk API token for vulnerability scanning
- `FOSSA_API_KEY` - FOSSA API key for license scanning
- `GITLEAKS_LICENSE` - GitLeaks license for enhanced secret scanning
- `BROWSERSTACK_USERNAME` - BrowserStack access username
- `BROWSERSTACK_ACCESS_KEY` - BrowserStack access key
- `OPENAI_API_KEY` - OpenAI API key for testing
- `GOOGLE_MAPS_API_KEY` - Google Maps API key for testing

## Branch Naming Conventions

The workflows support the following branch naming patterns:

- `main` - Production branch
- `develop` - Development branch
- `feat-*` - Feature branches (e.g., feat-user-authentication)
- `release-*` - Release branches (e.g., release-0.5.0-ALPHA1)

## Adding New Workflows

When adding new workflows, follow these guidelines:

1. Use descriptive workflow names
2. Include appropriate triggers
3. Maximize workflow reusability with parameterization
4. Document workflow purpose and parameters
5. Set appropriate timeout values
6. Configure notifications for workflow failures
7. Follow least privilege principle for permissions
8. Ensure proper error handling and reporting

## UX Audit System CI/CD Integration

The UX Audit System has specific CI/CD workflow steps for ensuring its reliability:

1. **Unit Tests**: Test individual components (`SessionRecording`, `HeatmapVisualization`, `UXMetricsEvaluation`)
2. **Integration Tests**: Test how components interact with services
3. **Stability Tests**: Verify resilience using the specific stability tests
4. **Smoke Tests**: Validate core functionality post-deployment
5. **Performance Tests**: Measure rendering performance and memory usage

These tests use mock data to simulate various user session scenarios and interaction patterns.

### Example Workflow Step for UX Audit System

```yaml
- name: Run UX Audit System stability tests
  run: |
    npm run test:stability:ux-audit
    mkdir -p test-results/ux-audit
    cp docs/project_lifecycle/stability_tests/results/data/ux-audit-*.json test-results/ux-audit/
  if: success() || failure()  # Run even if previous steps failed
```

## Task Prompt System CI/CD Integration

The Task Prompt System has specific CI/CD workflow steps for ensuring its reliability:

1. **Unit Tests**: Test individual components (`TaskPromptManager`, `InAppTaskPrompt`)
2. **Integration Tests**: Test how components interact with task services and UX audit system
3. **Stability Tests**: Verify resilience under various conditions
4. **Smoke Tests**: Validate core functionality post-deployment
5. **User Flow Tests**: Simulate complete task completion workflows

These tests verify task state management, multi-step task progression, and proper event recording.

### Example Workflow Step for Task Prompt System

```yaml
- name: Run Task Prompt System stability tests
  run: |
    npm run test:stability:task-prompt
    mkdir -p test-results/task-prompt
    cp docs/project_lifecycle/stability_tests/results/data/task-prompt-*.json test-results/task-prompt/
  if: success() || failure()  # Run even if previous steps failed
```

## Adding New Workflow Steps

When adding new workflow steps:

1. Add the step to the appropriate job
2. Ensure it runs the correct test command
3. Store test results in a consistent location
4. Configure the step to run on appropriate conditions
5. Add artifact upload for test results if needed

## Viewing Test Results

Test results are:
1. Stored as artifacts in GitHub Actions
2. Available for download for 90 days
3. Summarized in PR comments through GitHub Actions

## Troubleshooting

If a workflow fails:

1. Check the GitHub Actions tab for the specific error
2. Download artifacts to view detailed test results
3. Check if the test is flaky (inconsistent)
4. Check for environment-specific issues

# Test Artifact Collection and Processing

After the test run, artifacts are collected:

```bash
# UX Audit artifacts
mkdir -p test-results/ux-audit
cp docs/project_lifecycle/all_tests/results/data/ux-audit-*.json test-results/ux-audit/

# Upload artifacts
actions/upload-artifact@v3
  name: ux-audit-test-results
  path: test-results/ux-audit
```

```bash
# Task Prompt artifacts
mkdir -p test-results/task-prompt
cp docs/project_lifecycle/all_tests/results/data/task-prompt-*.json test-results/task-prompt/

# Upload artifacts
actions/upload-artifact@v3
  name: task-prompt-test-results
  path: test-results/task-prompt
```

## Test Framework

### Updated Test Framework Structure

The TourGuideAI test framework has been updated to provide better organization, consistency, and reporting:

- **Centralized Test Runner**: All tests now use the PowerShell-based test runner located at `tests/run-frontend-tests.ps1`
- **GitHub-specific Runner**: For CI/CD environments, a specialized script in `.github/workflows/scripts/run-github-tests.ps1` is used
- **Organized Results**: Test results are stored in a standardized directory structure under `docs/project_lifecycle/all_tests/results/`
- **Framework Detection**: The runner automatically detects and appropriately handles different test frameworks (Playwright, Jest)
- **Enhanced Reporting**: Test reports include detailed summaries, categorized results, and GitHub-friendly output formats

### Test Categories and Directories

The test framework supports the following categories, each with a dedicated results directory:

- **Playwright Tests**: `docs/project_lifecycle/all_tests/results/playwright-test/` - E2E and browser-based tests
- **Stability Tests**: `docs/project_lifecycle/all_tests/results/stability-test/` - Testing component and system stability
- **Performance Tests**: `docs/project_lifecycle/all_tests/results/performance/` - Load and performance testing
- **User Journey Tests**: `docs/project_lifecycle/all_tests/results/user-journey/` - End-to-end user workflow tests

### Running Tests in CI/CD

The workflow files have been updated to use the centralized test runner:

```yaml
- name: Install PowerShell
  uses: bjompen/UpdatePWSHAction@v1.0.1
  with:
    ReleaseVersion: 'stable'

- name: Setup PowerShell Execution Policy
  shell: pwsh
  run: |
    try {
      Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process -Force -ErrorAction SilentlyContinue
    } catch {
      Write-Output "Note: Unable to set execution policy. This is expected in some CI environments and can be ignored."
    }
    # Verify PowerShell is working
    Write-Output "PowerShell Version: $($PSVersionTable.PSVersion)"

- name: Run Tests
  run: |
    pwsh -ExecutionPolicy Bypass -File ./tests/run-frontend-tests.ps1
```
