/**
 * Test Script Template
 * 
 * This template follows the project's best practices for test execution and reporting.
 * Use this as a starting point for creating new test scripts.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Define test parameters
const TEST_NAME = 'example-test'; // Change this to your test name
const TEST_TYPE = 'example'; // Change this to your test type (e.g., 'unit', 'e2e', 'load')

// Always use an existing repository directory for output
// Following the pattern: docs/project_lifecycle/all_tests/results/{test-type}
const resultsBaseDir = path.join('docs', 'project_lifecycle', 'all_tests', 'results', TEST_TYPE);
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const resultsFile = path.join(resultsBaseDir, `${TEST_NAME}-results-${timestamp}.json`);
const summaryFile = path.join(resultsBaseDir, 'test_summary.md');

// Create results directory if it doesn't exist
if (!fs.existsSync(resultsBaseDir)) {
  fs.mkdirSync(resultsBaseDir, { recursive: true });
}

// Run test function
async function runTests() {
  console.log(`Running ${TEST_NAME} tests...`);
  
  try {
    // Replace this with your actual test command
    // For example: const output = execSync('npm test path/to/tests');
    const output = `Example test output for ${TEST_NAME}`;
    
    // Example test results structure
    const results = {
      timestamp: new Date().toISOString(),
      name: TEST_NAME,
      success: true,
      details: {
        passed: 10,
        failed: 0,
        skipped: 2
      },
      output: output
    };
    
    // Save test results
    fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
    console.log(`Test results saved to ${resultsFile}`);
    
    // Update summary file
    updateSummary(results);
    
    // Create latest redirect
    createLatestRedirect(resultsFile);
    
    return true;
  } catch (error) {
    // Handle test failure
    const results = {
      timestamp: new Date().toISOString(),
      name: TEST_NAME,
      success: false,
      error: error.message,
      details: {
        passed: 0,
        failed: 1,
        skipped: 0
      }
    };
    
    // Save test results
    fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
    console.log(`Test failed. Results saved to ${resultsFile}`);
    
    // Update summary file
    updateSummary(results);
    
    return false;
  }
}

// Update the test summary markdown file
function updateSummary(results) {
  const status = results.success ? '✅ PASSED' : '❌ FAILED';
  const date = new Date().toLocaleString();
  const resultLink = path.basename(resultsFile);
  
  let content = '';
  
  try {
    content = fs.readFileSync(summaryFile, 'utf8');
  } catch (err) {
    // File does not exist, create new
    content = `# ${TEST_NAME.charAt(0).toUpperCase() + TEST_NAME.slice(1)} Test History\n\n`;
    content += `| Date | Status | Details | Results File |\n`;
    content += `|------|--------|---------|-------------|\n`;
  }
  
  // Add new entry after the header (at line 4)
  const lines = content.split('\n');
  const headerEnd = content.includes('|------|') ? 
    content.indexOf('|------') + content.substring(content.indexOf('|------')).indexOf('\n') + 1 : 
    content.length;
  
  // Format details based on test results
  let details = '';
  if (results.details) {
    const { passed, failed, skipped } = results.details;
    details = `Passed: ${passed}, Failed: ${failed}, Skipped: ${skipped}`;
  } else if (results.error) {
    details = `Error: ${results.error.substring(0, 50)}...`;
  }
  
  // Create new line for test result
  const newLine = `| ${date} | ${status} | ${details} | [Results](./${resultLink}) |`;
  
  // Insert after header
  content = content.substring(0, headerEnd) + '\n' + newLine + 
           (headerEnd < content.length ? content.substring(headerEnd) : '');
  
  try {
    fs.writeFileSync(summaryFile, content);
    console.log(`Summary updated at ${summaryFile}`);
  } catch (err) {
    console.error(`Failed to update summary at ${summaryFile}:`, err);
  }
}

// Create a file that points to the latest results
function createLatestRedirect(resultsFile) {
  const latestFile = path.join(resultsBaseDir, 'latest.txt');
  const content = `Latest test results: ${path.basename(resultsFile)}\nRun at: ${new Date().toISOString()}`;
  
  try {
    fs.writeFileSync(latestFile, content);
    console.log(`Latest results reference created at ${latestFile}`);
  } catch (err) {
    console.error(`Failed to create latest results reference at ${latestFile}:`, err);
  }
  
  // For HTML reports, create an HTML redirect
  if (resultsFile.endsWith('.html')) {
    const latestHtml = path.join(resultsBaseDir, 'latest.html');
    const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta http-equiv="refresh" content="0; url='./${path.basename(resultsFile)}'" />
      </head>
      <body>
        <p>Redirecting to latest test report...</p>
      </body>
    </html>
    `;
    
    try {
      fs.writeFileSync(latestHtml, htmlContent);
      console.log(`Latest HTML redirect created at ${latestHtml}`);
    } catch (err) {
      console.error(`Failed to create latest HTML redirect at ${latestHtml}:`, err);
    }
  }
}

// Run the tests
runTests().then(success => {
  if (success) {
    console.log('Tests completed successfully');
    process.exit(0);
  } else {
    console.log('Tests failed');
    process.exit(1);
  }
}).catch(error => {
  console.error('Error running tests:', error);
  process.exit(1);
}); 