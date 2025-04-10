#!/usr/bin/env node

/**
 * Script to run the security audit for TourGuideAI
 * 
 * Prerequisites:
 * 1. OWASP ZAP must be installed and running
 * 2. Target application must be accessible
 * 
 * Usage:
 * node scripts/run-security-audit.js [target_url] [zap_proxy_url]
 */

// Check if OWASP ZAP is running
const axios = require('axios');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// ANSI color codes for output formatting
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

// Parse command-line arguments
const targetUrl = process.argv[2] || process.env.TARGET_URL || 'https://staging.tourguideai.com';
const zapProxyUrl = process.argv[3] || process.env.ZAP_PROXY || 'http://localhost:8080';
const mockMode = process.argv[4] === 'mock' || process.env.MOCK_MODE === 'true';

// Create security-reports directory if it doesn't exist
const reportDir = path.join(__dirname, '..', 'docs', 'project_lifecycle', 'all_tests', 'results', 'security-reports');
if (!fs.existsSync(reportDir)) {
  fs.mkdirSync(reportDir, { recursive: true });
}

// Timestamp for reports
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const reportName = `security-scan-${timestamp}`;
const reportPath = path.join(reportDir, reportName);

/**
 * Print formatted status message
 * @param {string} message - Message to display
 * @param {string} type - Message type (info, success, error, warning)
 */
function log(message, type = 'info') {
  let prefix = '';
  
  switch (type) {
    case 'success':
      prefix = `${colors.green}✓${colors.reset} `;
      break;
    case 'error':
      prefix = `${colors.red}✗${colors.reset} `;
      break;
    case 'warning':
      prefix = `${colors.yellow}⚠${colors.reset} `;
      break;
    case 'info':
      prefix = `${colors.blue}ℹ${colors.reset} `;
      break;
    default:
      prefix = '';
  }
  
  console.log(`${prefix}${message}`);
}

// Function to check if ZAP is running
async function checkZapIsRunning(zapUrl) {
  try {
    log(`Checking if ZAP is running at ${zapUrl}...`);
    const response = await axios.get(`${zapUrl}/JSON/core/view/version/`, {
      validateStatus: false,
      timeout: 5000,
    });
    
    if (response.status === 200) {
      const version = response.data?.version || 'unknown';
      log(`ZAP is running (version: ${version})`, 'success');
      return true;
    } else {
      log(`ZAP returned status ${response.status}`, 'error');
      return false;
    }
  } catch (error) {
    log(`ZAP is not running or not accessible at ${zapUrl}`, 'error');
    return false;
  }
}

// Function to start ZAP if it's not running
async function startZap() {
  log('OWASP ZAP is not running. Attempting to start it...', 'warning');
  
  // Determine OS and ZAP executable path
  let zapPath;
  const isWindows = process.platform === 'win32';
  
  if (isWindows) {
    zapPath = process.env.ZAP_PATH || 'C:\\Program Files\\OWASP\\Zed Attack Proxy\\zap.bat';
  } else {
    zapPath = process.env.ZAP_PATH || '/usr/share/zaproxy/zap.sh';
  }
  
  if (!fs.existsSync(zapPath)) {
    log(`ZAP executable not found at ${zapPath}`, 'error');
    log('Please install OWASP ZAP or set ZAP_PATH environment variable to the correct path', 'error');
    
    if (mockMode) {
      log('Running in mock mode. Continuing without ZAP...', 'warning');
      return false;
    } else {
      log('To run without ZAP, use the mock mode: node scripts/run-security-audit.js [target_url] [zap_proxy_url] mock', 'info');
      process.exit(1);
    }
  }
  
  try {
    // Start ZAP in daemon mode using execSync
    log('Starting ZAP daemon...');
    const { execSync } = require('child_process');
    
    // Use start /b on Windows to start the process in the background
    if (isWindows) {
      execSync(`start /b "${zapPath}" -daemon -config api.disablekey=true`, {
        shell: true,
        stdio: 'ignore'
      });
    } else {
      execSync(`"${zapPath}" -daemon -config api.disablekey=true &`, {
        shell: true,
        stdio: 'ignore'
      });
    }
  } catch (error) {
    log(`Error starting ZAP: ${error.message}`, 'error');
    log('Please start ZAP manually.', 'error');
    process.exit(1);
  }
  
  // Wait for ZAP to start
  let zapRunning = false;
  let attempts = 0;
  const maxAttempts = 10;
  while (!zapRunning && attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    zapRunning = await checkZapIsRunning(zapProxyUrl);
    attempts++;
    if (!zapRunning) {
      log(`Waiting for ZAP to start... (attempt ${attempts}/${maxAttempts})`, attempts >= maxAttempts/2 ? 'warning' : 'info');
    }
  }
  
  if (!zapRunning) {
    log('Failed to start ZAP. Please start it manually.', 'error');
    process.exit(1);
  }
  
  log('ZAP started successfully!', 'success');
  return true;
}

// Function to install dependencies
async function installDependencies() {
  return new Promise((resolve, reject) => {
    log('Installing dependencies...', 'info');
    
    try {
      // Use require to check if the modules are already installed
      // This avoids spawning a child process which is failing with EINVAL
      try {
        require('zaproxy');
        require('axios');
        log('Dependencies already installed', 'success');
        resolve();
        return;
      } catch (err) {
        // Module not found, continue with installation
      }
      
      // Alternative approach using execSync instead of spawn
      const { execSync } = require('child_process');
      const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
      
      try {
        const output = execSync(`${npm} install zaproxy axios`, {
          cwd: path.join(__dirname, '..'),
          stdio: 'pipe',
          encoding: 'utf8'
        });
        
        log('Dependencies installed successfully', 'success');
        resolve();
      } catch (execError) {
        log(`npm install failed: ${execError.message}`, 'error');
        reject(new Error(`npm install failed: ${execError.message}`));
      }
    } catch (error) {
      log(`Error installing dependencies: ${error.message}`, 'error');
      reject(error);
    }
  });
}

// Create latest.html that redirects to the most recent report
function createLatestRedirect(reportFile) {
  const latestHtml = `
  <!DOCTYPE html>
  <html>
    <head>
      <meta http-equiv="refresh" content="0; url='./${path.basename(reportFile)}'" />
    </head>
    <body>
      <p>Redirecting to latest security report...</p>
    </body>
  </html>
  `;
  
  fs.writeFileSync(path.join(reportDir, 'latest.html'), latestHtml);
  log(`Created redirect to latest report: ${path.join(reportDir, 'latest.html')}`, 'success');
}

// Function to run a mock security scan
async function runMockSecurityScan() {
  log('Running mock security scan...', 'info');
  
  // Define sample vulnerabilities for the mock scan
  const mockVulnerabilities = [
    { risk: 'Low', name: 'X-Content-Type-Options Header Missing', url: `${targetUrl}/login` },
    { risk: 'Medium', name: 'Application Error Disclosure', url: `${targetUrl}/api/user` },
    { risk: 'Informational', name: 'Modern Web Application', url: targetUrl }
  ];
  
  // Wait to simulate scanning
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Create a mock report
  const mockReportContent = `
<!DOCTYPE html>
<html>
<head>
  <title>TourGuideAI Security Scan - MOCK REPORT</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 2em; }
    .mock-warning { background-color: #fff3cd; border: 1px solid #ffeeba; padding: 1em; margin-bottom: 1em; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f2f2f2; }
    .risk-low { background-color: #d4edda; }
    .risk-medium { background-color: #fff3cd; }
    .risk-info { background-color: #d1ecf1; }
  </style>
</head>
<body>
  <h1>TourGuideAI Security Scan Report (MOCK)</h1>
  <div class="mock-warning">
    <strong>WARNING:</strong> This is a mock report generated without using OWASP ZAP. 
    It contains simulated findings for demonstration purposes only.
  </div>
  
  <h2>Summary</h2>
  <p>Scan target: ${targetUrl}</p>
  <p>Scan date: ${new Date().toISOString()}</p>
  
  <h2>Findings</h2>
  <table>
    <tr>
      <th>Risk Level</th>
      <th>Issue</th>
      <th>URL</th>
    </tr>
    ${mockVulnerabilities.map(vuln => `
    <tr class="risk-${vuln.risk.toLowerCase()}">
      <td>${vuln.risk}</td>
      <td>${vuln.name}</td>
      <td>${vuln.url}</td>
    </tr>
    `).join('')}
  </table>
  
  <h2>Recommendations</h2>
  <ul>
    <li>Install OWASP ZAP for proper security scanning</li>
    <li>Run regular security scans against staging and production environments</li>
    <li>Review application headers and error handling</li>
  </ul>
  
  <p><em>This is a mock report for development and testing purposes.</em></p>
</body>
</html>
  `;
  
  // Save the mock report
  const reportFile = `${reportPath}.html`;
  fs.writeFileSync(reportFile, mockReportContent);
  
  log('Mock security scan completed successfully!', 'success');
  log(`Mock report saved to: ${reportFile}`, 'success');
  
  createLatestRedirect(reportFile);
  return true;
}

// Main function
async function main() {
  try {
    console.log(`
${colors.bold}┌─────────────────────────────────────────┐${colors.reset}
${colors.bold}│  TourGuideAI Security Audit             │${colors.reset}
${colors.bold}├─────────────────────────────────────────┤${colors.reset}
${colors.bold}│  Target URL: ${targetUrl.padEnd(27)}│${colors.reset}
${colors.bold}│  ZAP Proxy:  ${zapProxyUrl.padEnd(27)}│${colors.reset}
${colors.bold}│  Report Dir: ${reportDir.padEnd(27)}│${colors.reset}
${colors.bold}│  Mock Mode:  ${(mockMode ? 'Enabled' : 'Disabled').padEnd(27)}│${colors.reset}
${colors.bold}└─────────────────────────────────────────┘${colors.reset}
`);
    
    // If in mock mode, skip ZAP related steps
    if (mockMode) {
      log('Running in mock mode - OWASP ZAP will not be used', 'warning');
      await runMockSecurityScan();
      return;
    }
    
    // Ensure dependencies are installed
    try {
      require('zaproxy');
    } catch (error) {
      await installDependencies();
    }
    
    // Check if ZAP is running
    const isZapRunning = await checkZapIsRunning(zapProxyUrl);
    
    if (!isZapRunning) {
      const zapStarted = await startZap();
      if (!zapStarted && mockMode) {
        // If ZAP didn't start but we're in mock mode, run the mock scan
        await runMockSecurityScan();
        return;
      }
    }
    
    // Set environment variables for the security audit script
    process.env.TARGET_URL = targetUrl;
    process.env.ZAP_PROXY = zapProxyUrl;
    process.env.REPORT_PATH = reportPath;
    
    // Run the security audit script
    log('Running security audit...', 'info');
    try {
      const { execSync } = require('child_process');
      const output = execSync(`node "${path.join(__dirname, '..', 'tests', 'security', 'security-audit.js')}"`, {
        stdio: 'inherit',
        env: {
          ...process.env,
          TARGET_URL: targetUrl,
          ZAP_PROXY: zapProxyUrl,
          REPORT_PATH: reportPath
        }
      });
      
      log('Security audit completed successfully!', 'success');
      
      // Check if the report file was created
      const reportFile = `${reportPath}.html`;
      if (fs.existsSync(reportFile)) {
        log(`Report saved to: ${reportFile}`, 'success');
        createLatestRedirect(reportFile);
        log('Security audit report is ready for review.', 'success');
      } else {
        log(`Expected report file not found: ${reportFile}`, 'warning');
      }
    } catch (error) {
      log(`Security audit failed: ${error.message}`, 'error');
      process.exit(1);
    }
    
  } catch (error) {
    log(`Error: ${error.message}`, 'error');
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run the main function
main(); 