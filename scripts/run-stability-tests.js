const { execSync } = require('child_process');
const fs = require('fs');

// List of test files to run
const testFiles = [
  'src/tests/pages/ProfilePage.test.js',
  'src/tests/pages/ChatPage.test.js',
  'src/tests/pages/MapPage.test.js',
  'src/tests/stability/frontend-stability.test.js',
];

// Results storage
const results = {
  passed: [],
  failed: []
};

// Run each test file individually
console.log('Running stability tests...\n');

for (const testFile of testFiles) {
  // Check if file exists
  if (!fs.existsSync(testFile)) {
    console.log(`SKIPPED: ${testFile} (File not found)`);
    continue;
  }

  try {
    console.log(`Running: ${testFile}`);
    const output = execSync(`npx jest ${testFile} --json`).toString();
    const result = JSON.parse(output);
    
    // Check if all tests passed
    if (result.numFailedTests === 0) {
      console.log(`✅ PASSED: ${testFile} (${result.numPassedTests} tests)`);
      results.passed.push({ file: testFile, count: result.numPassedTests });
    } else {
      console.log(`❌ FAILED: ${testFile} (${result.numFailedTests} of ${result.numTotalTests} tests failed)`);
      results.failed.push({ file: testFile, count: result.numFailedTests });
    }
  } catch (error) {
    console.log(`❌ FAILED: ${testFile} (Error running tests)`);
    results.failed.push({ file: testFile, error: error.message });
  }
  
  console.log(''); // Empty line between test files
}

// Print summary
console.log('=== SUMMARY ===');
console.log(`Total files tested: ${testFiles.length}`);
console.log(`Passed: ${results.passed.length} files`);
console.log(`Failed: ${results.failed.length} files`);

if (results.failed.length > 0) {
  console.log('\nFailed tests:');
  results.failed.forEach(failure => {
    console.log(`- ${failure.file} (${failure.count || 'unknown'} failures)`);
  });
  process.exit(1);
} else {
  console.log('\nAll tests have passed successfully!');
}

// Save test results to docs folder
const saveResults = () => {
  const resultsDir = 'docs/project_lifecycle/stability_tests/records/test-results';
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }
  
  // Save results to a JSON file
  const resultsFile = `${resultsDir}/stability-test-results-${timestamp}.json`;
  fs.writeFileSync(
    resultsFile, 
    JSON.stringify({
      timestamp: new Date().toISOString(),
      totalFiles: testFiles.length,
      passed: results.passed,
      failed: results.failed,
      summary: {
        passedCount: results.passed.length,
        failedCount: results.failed.length
      }
    }, null, 2)
  );
  
  console.log(`\nTest results saved to ${resultsFile}`);
  
  // Update the last run file
  fs.writeFileSync(
    `${resultsDir}/.last-run.json`,
    JSON.stringify({ lastRun: timestamp }, null, 2)
  );
};

// Save results
saveResults(); 