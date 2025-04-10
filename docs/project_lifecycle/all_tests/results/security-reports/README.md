# Security Reports

This directory contains security scan reports for the TourGuideAI application.

## Overview

Security scans help identify potential vulnerabilities in the application, including:
- Input validation issues
- Authentication and authorization flaws
- Cross-site scripting (XSS) vulnerabilities
- Sensitive data exposure
- API security issues

## Running Security Scans

### With OWASP ZAP (Recommended)

For comprehensive security testing:

1. Install [OWASP ZAP](https://www.zaproxy.org/download/)
2. Start ZAP manually or let the script start it
3. Run the security audit script:

```bash
node scripts/run-security-audit.js [target_url] [zap_proxy_url]
```

Example:
```bash
node scripts/run-security-audit.js https://staging.tourguideai.com http://localhost:8080
```

### Without OWASP ZAP (Mock Mode)

If you don't have OWASP ZAP installed, you can run in mock mode:

```bash
node scripts/run-security-audit.js [target_url] [zap_proxy_url] mock
```

Or set the environment variable:
```bash
set MOCK_MODE=true
node scripts/run-security-audit.js
```

> **Note**: Mock mode generates simulated findings for testing purposes only. It does not perform actual security scanning.

## Report Types

- `security-scan-[timestamp].html`: Full scan report with detailed findings
- `latest.html`: Redirect to the most recent scan report

## Interpreting Results

Reports include:
- Risk levels (High, Medium, Low, Informational)
- Vulnerability descriptions
- Affected URLs
- Recommendations for remediation

## Security Best Practices

- Run security scans before each major release
- Address high-risk findings immediately
- Regularly review and update security configurations
- Follow OWASP Top 10 guidelines for secure development

For questions about security testing, contact the security team. 