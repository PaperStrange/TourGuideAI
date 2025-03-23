# Security Policy

## Supported Versions

TourGuideAI maintains security updates for the following versions. If you're using an older version, we strongly recommend upgrading to a supported version.

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| 0.9.x   | :white_check_mark: |
| 0.8.x   | :white_check_mark: |
| < 0.8.0 | :x:                |

## Reporting a Vulnerability

The TourGuideAI team takes security vulnerabilities seriously. We appreciate your efforts to responsibly disclose your findings and will make every effort to acknowledge your contributions.

To report a vulnerability:

1. **Email**: Send details to security@tourguideai.example.com
2. **Include details**: Provide a clear description of the vulnerability, including steps to reproduce and potential impact
3. **Response time**: You can expect an initial response within 48 hours acknowledging receipt
4. **Disclosure process**: We follow a 90-day disclosure timeline where we work to patch the issue before public disclosure

## Security Best Practices

### For Developers

1. **Environment Variables**
   - Never commit `.env` files to version control
   - Use the provided `scripts/generate-keys.js` script to generate secure random keys for JWT and encryption
   - Follow the pattern in `.env.example` files for configuration

2. **API Key Management**
   - Store API keys securely using environment variables
   - Implement key rotation schedules for production environments
   - Use the encryption mechanisms provided in the codebase

3. **Authentication**
   - Use strong passwords (minimum 12 characters) for admin accounts
   - Remove default credentials in production environments
   - Implement proper password hashing with bcrypt (already configured)

### For Administrators

1. **Deployment Security**
   - In production, use a secrets manager service rather than environment files
   - Rotate JWT secrets and encryption keys regularly
   - Enable HTTPS for all communications

2. **Server Configuration**
   - Implement rate limiting (already configured)
   - Use secure headers for all API endpoints
   - Monitor for unusual activity patterns

3. **User Account Security**
   - Enforce strong password policies
   - Implement proper authorization checks
   - Use the email verification workflow for new accounts

## Recent Security Improvements

Recent security enhancements to the codebase include:

1. Implemented secure key generation script
2. Removed hardcoded credentials from configuration files
3. Added proper security validation in user account creation
4. Enhanced gitignore rules to prevent sensitive file commits
5. Implemented secure handling of environment variables
6. Added memory cleanup for sensitive data
7. Enhanced password validation and security warnings

## Security Tools

We recommend using the following tools to scan for security issues:

1. **Dependency Scanning**: Use `npm audit` regularly
2. **Static Analysis**: Configure a static code analysis tool in your CI/CD pipeline
3. **Environment Validation**: Use the built-in validation checks in the codebase

## Acknowledgments

We would like to acknowledge all security researchers and community members who have helped improve the security of TourGuideAI through responsible disclosure. 