# GitHub Workflows

This directory contains GitHub Actions workflow definitions for continuous integration, delivery, and security scanning.

## Workflows

### CI/CD Pipeline (`ci-cd.yml`)

The CI/CD workflow handles continuous integration and deployment:

- **Triggers**: Push to main branch, pull requests to main, workflow dispatch
- **Environments**: Development, Staging, Production
- **Steps**:
  - Code checkout
  - Dependency installation
  - Unit testing
  - Integration testing
  - Build optimization
  - Smoke testing
  - Deployment to appropriate environment

### Security Scanning (`security-scan.yml`)

The security scanning workflow performs automated security checks:

- **Triggers**: Weekly schedule (Mondays at 2 AM), push to main branch, workflow dispatch
- **Scans**:
  - npm audit for vulnerable dependencies
  - ESLint security plugins for static code analysis
  - NodeJsScan for Node.js-specific security issues
  - OWASP ZAP baseline scan for web vulnerabilities
- **Reporting**:
  - Uploads scan results as artifacts
  - Creates GitHub issues for critical findings
  - Provides detailed reports in various formats

## Configuration Files

- `eslint-security.json` - ESLint configuration for security scanning
- `zap-rules.tsv` - Rules for OWASP ZAP scanning

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

- `BROWSERSTACK_USERNAME` - BrowserStack access username
- `BROWSERSTACK_ACCESS_KEY` - BrowserStack access key
- `AWS_ACCESS_KEY_ID` - AWS access key for deployment
- `AWS_SECRET_ACCESS_KEY` - AWS secret key for deployment
- `OPENAI_API_KEY` - OpenAI API key for testing
- `GOOGLE_MAPS_API_KEY` - Google Maps API key for testing

## Adding New Workflows

When adding new workflows, follow these guidelines:

1. Use descriptive workflow names
2. Include appropriate triggers
3. Maximize workflow reusability with parameterization
4. Document workflow purpose and parameters
5. Set appropriate timeout values
6. Configure notifications for workflow failures 