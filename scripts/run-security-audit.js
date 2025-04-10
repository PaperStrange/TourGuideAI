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

// Create security-reports directory if it doesn't exist
const reportDir = path.join(__dirname, '..', 'security-reports');
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
    process.exit(1);
  }
  
  // Start ZAP in daemon mode
  const zapProcess = spawn(zapPath, ['-daemon', '-config', 'api.disablekey=true'], {
    detached: true,
    stdio: 'ignore',
  });
  
  // Allow ZAP to start
  log('Starting ZAP daemon...');
  zapProcess.unref();
  
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
}

// Function to install dependencies
async function installDependencies() {
  return new Promise((resolve, reject) => {
    log('Installing dependencies...', 'info');
    
    const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const install = spawn(npm, ['install', 'zaproxy', 'axios'], {
      cwd: path.join(__dirname, '..'),
    });
    
    install.stdout.on('data', data => console.log(data.toString()));
    install.stderr.on('data', data => console.error(data.toString()));
    
    install.on('close', code => {
      if (code === 0) {
        log('Dependencies installed successfully', 'success');
        resolve();
      } else {
        log(`npm install failed with code ${code}`, 'error');
        reject(new Error(`npm install failed with code ${code}`));
      }
    });
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
${colors.bold}└─────────────────────────────────────────┘${colors.reset}
`);
    
    // Ensure dependencies are installed
    try {
      require('zaproxy');
    } catch (error) {
      await installDependencies();
    }
    
    // Check if ZAP is running
    const isZapRunning = await checkZapIsRunning(zapProxyUrl);
    
    if (!isZapRunning) {
      await startZap();
    }
    
    // Set environment variables for the security audit script
    process.env.TARGET_URL = targetUrl;
    process.env.ZAP_PROXY = zapProxyUrl;
    process.env.REPORT_PATH = reportPath;
    
    // Run the security audit script
    log('Running security audit...', 'info');
    const auditScript = spawn('node', [path.join(__dirname, '..', 'tests', 'security', 'security-audit.js')], {
      stdio: 'inherit',
      env: process.env,
    });
    
    auditScript.on('close', code => {
      if (code === 0) {
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
      } else {
        log(`Security audit failed with code ${code}`, 'error');
        process.exit(code);
      }
    });
    
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