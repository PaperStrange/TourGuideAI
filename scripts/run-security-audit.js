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

// Parse command-line arguments
const targetUrl = process.argv[2] || process.env.TARGET_URL || 'https://staging.tourguideai.com';
const zapProxyUrl = process.argv[3] || process.env.ZAP_PROXY || 'http://localhost:8080';

// Create security-reports directory if it doesn't exist
const reportDir = path.join(__dirname, '..', 'security-reports');
if (!fs.existsSync(reportDir)) {
  fs.mkdirSync(reportDir, { recursive: true });
}

// Function to check if ZAP is running
async function checkZapIsRunning(zapUrl) {
  try {
    const response = await axios.get(`${zapUrl}/JSON/core/view/version/`, {
      validateStatus: false,
      timeout: 5000,
    });
    
    return response.status === 200;
  } catch (error) {
    return false;
  }
}

// Function to start ZAP if it's not running
async function startZap() {
  console.log('OWASP ZAP is not running. Attempting to start it...');
  
  // Determine OS and ZAP executable path
  let zapPath;
  const isWindows = process.platform === 'win32';
  
  if (isWindows) {
    zapPath = process.env.ZAP_PATH || 'C:\\Program Files\\OWASP\\Zed Attack Proxy\\zap.bat';
  } else {
    zapPath = process.env.ZAP_PATH || '/usr/share/zaproxy/zap.sh';
  }
  
  if (!fs.existsSync(zapPath)) {
    console.error(`ZAP executable not found at ${zapPath}`);
    console.error('Please install OWASP ZAP or set ZAP_PATH environment variable to the correct path');
    process.exit(1);
  }
  
  // Start ZAP in daemon mode
  const zapProcess = spawn(zapPath, ['-daemon', '-config', 'api.disablekey=true'], {
    detached: true,
    stdio: 'ignore',
  });
  
  // Allow ZAP to start
  console.log('Starting ZAP daemon...');
  zapProcess.unref();
  
  // Wait for ZAP to start
  let zapRunning = false;
  let attempts = 0;
  while (!zapRunning && attempts < 10) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    zapRunning = await checkZapIsRunning(zapProxyUrl);
    attempts++;
    if (!zapRunning) {
      console.log(`Waiting for ZAP to start... (attempt ${attempts}/10)`);
    }
  }
  
  if (!zapRunning) {
    console.error('Failed to start ZAP. Please start it manually.');
    process.exit(1);
  }
  
  console.log('ZAP started successfully!');
}

// Function to install dependencies
async function installDependencies() {
  return new Promise((resolve, reject) => {
    console.log('Installing dependencies...');
    
    const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const install = spawn(npm, ['install', 'zaproxy', 'axios'], {
      cwd: path.join(__dirname, '..'),
    });
    
    install.stdout.on('data', data => console.log(data.toString()));
    install.stderr.on('data', data => console.error(data.toString()));
    
    install.on('close', code => {
      if (code === 0) {
        console.log('Dependencies installed successfully');
        resolve();
      } else {
        console.error(`npm install failed with code ${code}`);
        reject(new Error(`npm install failed with code ${code}`));
      }
    });
  });
}

// Main function
async function main() {
  try {
    console.log(`
┌─────────────────────────────────────────┐
│  TourGuideAI Security Audit             │
├─────────────────────────────────────────┤
│  Target URL: ${targetUrl.padEnd(27)}│
│  ZAP Proxy:  ${zapProxyUrl.padEnd(27)}│
└─────────────────────────────────────────┘
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
    } else {
      console.log('OWASP ZAP is running.');
    }
    
    // Set environment variables for the security audit script
    process.env.TARGET_URL = targetUrl;
    process.env.ZAP_PROXY = zapProxyUrl;
    
    // Run the security audit script
    console.log('Running security audit...');
    const auditScript = spawn('node', [path.join(__dirname, '..', 'tests', 'security-audit.js')], {
      stdio: 'inherit',
      env: process.env,
    });
    
    auditScript.on('close', code => {
      if (code === 0) {
        console.log('Security audit completed successfully!');
      } else {
        console.error(`Security audit failed with code ${code}`);
        process.exit(code);
      }
    });
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the main function
main(); 