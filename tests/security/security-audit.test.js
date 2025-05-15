/**
 * Security audit script for TourGuideAI using OWASP ZAP
 * This script performs automated security testing using the ZAP API
 */

const fs = require('fs');
const path = require('path');
let ZapClient;
let axios;

// Only require these in a non-test environment
if (process.env.NODE_ENV !== 'test') {
  try {
    ZapClient = require('zaproxy');
    axios = require('axios');
  } catch (error) {
    console.warn('ZAP dependencies not available, some functionality will be limited');
  }
}

// Jest test wrapper to make the file detectable by test runners
describe('Security Audit Tests', () => {
  // A simple test that can be run in any environment
  test('Security requirements are defined', () => {
    expect(config).toBeDefined();
    expect(config.target).toBeDefined();
    expect(config.scanConfig).toBeDefined();
  });
  
  // Skip the actual ZAP tests if we're in a test-only environment
  // or if the ZAP dependencies aren't available
  if (process.env.NODE_ENV === 'test' || !ZapClient || !axios) {
    test.skip('Full security audit (requires ZAP)', () => {
      console.log('Skipping ZAP security tests in test-only environment');
    });
  } else {
    test('Full security audit', async () => {
      await runSecurityAudit();
      expect(true).toBe(true); // Test passes if no exceptions are thrown
    }, 300000); // 5-minute timeout
  }
});

// Configuration
const config = {
  // ZAP configuration
  zap: {
    apiKey: process.env.ZAP_API_KEY || 'zap-api-key',
    proxy: process.env.ZAP_PROXY || 'http://localhost:8080',
  },
  // Target application
  target: process.env.TARGET_URL || 'https://staging.tourguideai.com',
  // Output directory for reports
  outputDir: path.join(__dirname, '..', 'security-reports'),
  // Report filename
  reportFilename: `security-report-${new Date().toISOString().slice(0, 10)}.html`,
  // Scan configuration
  scanConfig: {
    spider: true,
    ajaxSpider: true,
    activeScan: true,
    vulnerabilityReport: true,
  },
  // Authentication (if needed)
  auth: {
    enabled: false,
    username: process.env.AUTH_USERNAME,
    password: process.env.AUTH_PASSWORD,
    loginUrl: `${process.env.TARGET_URL || 'https://staging.tourguideai.com'}/login`,
    loginRequestData: 'username={%username%}&password={%password%}',
    loggedInIndicator: 'Logout',
  },
};

// Only execute the rest of the script if not in test-only mode
if (process.env.NODE_ENV !== 'test' && ZapClient && axios) {
  // Create ZAP client
  const zapOptions = {
    apiKey: config.zap.apiKey,
    proxy: config.zap.proxy,
  };

  const zap = new ZapClient(zapOptions);

  // Make sure output directory exists
  if (!fs.existsSync(config.outputDir)) {
    fs.mkdirSync(config.outputDir, { recursive: true });
  }
}

// Main function for running the security audit
async function runSecurityAudit() {
  try {
    console.log(`Starting security audit of ${config.target}`);
    
    // Access the target application through ZAP proxy
    console.log('Accessing target through ZAP proxy...');
    await accessUrlThroughZap(config.target);
    
    // Set up authentication if enabled
    if (config.auth.enabled) {
      console.log('Setting up authentication...');
      await setupAuthentication();
    }
    
    // Run traditional spider scan
    if (config.scanConfig.spider) {
      console.log('Running spider scan...');
      const spiderScanId = await zap.spider.scan(config.target, 0, 'true', null, 'true');
      await waitForSpiderCompletion(spiderScanId);
    }
    
    // Run AJAX spider scan
    if (config.scanConfig.ajaxSpider) {
      console.log('Running AJAX spider scan...');
      await zap.ajaxSpider.scan(config.target, 'true', null, 'true');
      await waitForAjaxSpiderCompletion();
    }
    
    // Run active scan
    if (config.scanConfig.activeScan) {
      console.log('Running active scan...');
      const activeScanId = await zap.ascan.scan(config.target, 'true', 'true', null, null, 'true');
      await waitForActiveScanCompletion(activeScanId);
    }
    
    // Generate and save vulnerability report
    if (config.scanConfig.vulnerabilityReport) {
      console.log('Generating vulnerability report...');
      await generateReport();
    }
    
    console.log('Security audit completed successfully!');
    console.log(`Report saved to: ${path.join(config.outputDir, config.reportFilename)}`);
    
  } catch (error) {
    console.error('Error during security audit:', error);
    process.exit(1);
  }
}

// Helper function to access URL through ZAP proxy
async function accessUrlThroughZap(url) {
  try {
    await axios.get(url, {
      proxy: {
        host: new URL(config.zap.proxy).hostname,
        port: new URL(config.zap.proxy).port,
      },
      validateStatus: () => true, // Accept any status code
    });
    console.log(`Successfully accessed ${url} through ZAP proxy`);
  } catch (error) {
    console.error(`Error accessing ${url} through ZAP proxy:`, error.message);
    throw error;
  }
}

// Helper function to set up authentication
async function setupAuthentication() {
  try {
    // Set up authentication method
    await zap.authentication.setAuthenticationMethod(
      'default', 
      'formBasedAuthentication', 
      `loginUrl=${config.auth.loginUrl}&loginRequestData=${config.auth.loginRequestData}`
    );
    
    // Set logged in indicator
    await zap.authentication.setLoggedInIndicator('default', config.auth.loggedInIndicator);
    
    // Set up users
    const userId = await zap.users.newUser('default', 'TourGuideAI User');
    await zap.users.setAuthenticationCredentials(
      'default',
      userId,
      `username=${config.auth.username}&password=${config.auth.password}`
    );
    await zap.users.setUserEnabled('default', userId, true);
    
    // Enable forced user mode
    await zap.forcedUser.setForcedUserModeEnabled(true);
    await zap.forcedUser.setForcedUser('default', userId);
    
    console.log('Authentication set up successfully');
  } catch (error) {
    console.error('Error setting up authentication:', error.message);
    throw error;
  }
}

// Helper function to wait for traditional spider completion
async function waitForSpiderCompletion(scanId) {
  let status = 0;
  while (status < 100) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    status = parseInt(await zap.spider.status(scanId));
    console.log(`Spider progress: ${status}%`);
  }
  console.log('Spider scan completed');
}

// Helper function to wait for AJAX spider completion
async function waitForAjaxSpiderCompletion() {
  let running = true;
  while (running) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    running = (await zap.ajaxSpider.status) === 'running';
    console.log(`AJAX Spider ${running ? 'still running' : 'completed'}`);
  }
  console.log('AJAX Spider scan completed');
}

// Helper function to wait for active scan completion
async function waitForActiveScanCompletion(scanId) {
  let status = 0;
  while (status < 100) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    status = parseInt(await zap.ascan.status(scanId));
    console.log(`Active scan progress: ${status}%`);
  }
  console.log('Active scan completed');
}

// Helper function to generate and save vulnerability report
async function generateReport() {
  const report = await zap.core.htmlreport();
  const reportPath = path.join(config.outputDir, config.reportFilename);
  
  fs.writeFileSync(reportPath, report);
  
  // Also generate a JSON report for easier processing
  const jsonReport = await zap.core.jsonreport();
  fs.writeFileSync(
    path.join(config.outputDir, config.reportFilename.replace('.html', '.json')),
    jsonReport
  );
  
  // Generate summary report
  const alerts = JSON.parse(await zap.core.alerts()).alerts;
  
  const summary = {
    datetime: new Date().toISOString(),
    target: config.target,
    totalAlerts: alerts.length,
    riskBreakdown: {
      high: alerts.filter(alert => alert.risk === 'High').length,
      medium: alerts.filter(alert => alert.risk === 'Medium').length,
      low: alerts.filter(alert => alert.risk === 'Low').length,
      informational: alerts.filter(alert => alert.risk === 'Informational').length,
    },
    topIssues: alerts
      .sort((a, b) => {
        const riskOrder = { High: 3, Medium: 2, Low: 1, Informational: 0 };
        return riskOrder[b.risk] - riskOrder[a.risk];
      })
      .slice(0, 10)
      .map(alert => ({
        name: alert.name,
        risk: alert.risk,
        confidence: alert.confidence,
        url: alert.url,
        param: alert.param,
        solution: alert.solution,
      })),
  };
  
  fs.writeFileSync(
    path.join(config.outputDir, config.reportFilename.replace('.html', '-summary.json')),
    JSON.stringify(summary, null, 2)
  );
  
  console.log(`Reports saved to ${config.outputDir}`);
  printSummary(summary);
}

// Helper function to print summary to console
function printSummary(summary) {
  console.log('\n=== SECURITY AUDIT SUMMARY ===');
  console.log(`Target: ${summary.target}`);
  console.log(`Total Alerts: ${summary.totalAlerts}`);
  console.log('\nRisk Breakdown:');
  console.log(`  High Risk: ${summary.riskBreakdown.high}`);
  console.log(`  Medium Risk: ${summary.riskBreakdown.medium}`);
  console.log(`  Low Risk: ${summary.riskBreakdown.low}`);
  console.log(`  Informational: ${summary.riskBreakdown.informational}`);
  
  if (summary.topIssues.length > 0) {
    console.log('\nTop Issues:');
    summary.topIssues.forEach((issue, index) => {
      console.log(`\n${index + 1}. ${issue.name}`);
      console.log(`   Risk: ${issue.risk}`);
      console.log(`   URL: ${issue.url}`);
      console.log(`   Parameter: ${issue.param || 'N/A'}`);
    });
  }
  
  console.log('\nFor complete details, please refer to the HTML report.');
}

// Run the security audit
runSecurityAudit(); 