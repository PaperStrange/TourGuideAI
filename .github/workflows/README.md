# GitHub Workflows

This directory contains GitHub Actions workflow definitions for continuous integration, delivery, and security scanning.

## Workflows

### CI/CD Pipeline (`ci-cd.yml`)

The CI/CD workflow handles continuous integration and deployment:

- **Triggers**: 
  - Push to main, develop, feat-* and release-* branches
  - Pull requests to main, develop, and release-* branches
- **Environments**: Development, Staging, Production
- **Steps**:
  - Code checkout
  - Dependency installation and review
  - Unit testing
  - Integration testing
  - Build optimization
  - CodeQL security analysis
  - Smoke testing
  - Deployment to appropriate environment
  - Feature branches are built and tested
  - Release branches are built, tested, and deployed to staging

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