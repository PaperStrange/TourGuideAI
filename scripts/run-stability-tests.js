const { execSync } = require('child_process');
const fs = require('fs');

// List of test files to run, categorized by app section
const testFilesByCategory = {
  'core-app': [
    'src/tests/pages/ProfilePage.test.js',
    'src/tests/pages/ChatPage.test.js',
    'src/tests/pages/MapPage.test.js',
    'src/tests/stability/frontend-stability.test.js',
  ],
  'beta-program': [
    'src/tests/components/analytics/AnalyticsDashboard.test.js',
    'src/tests/components/survey/SurveyList.test.js',
    'src/tests/components/survey/SurveyBuilder.test.js',
  ],
  'ux-audit': [
    'src/tests/stability/ux-audit-stability.test.js',
    'src/tests/beta-program/ux-audit/SessionRecording.test.jsx',
    'src/tests/beta-program/ux-audit/UXHeatmap.test.jsx',
    'src/tests/beta-program/ux-audit/UXMetricsEvaluation.test.jsx',
    'src/tests/beta-program/ux-audit/UXAuditDashboard.test.jsx',
  ],
  'task-prompt': [
    'src/tests/stability/task-prompt-stability.test.js',
    'src/tests/beta-program/task-prompt/TaskPromptManager.test.jsx',
    'src/tests/beta-program/task-prompt/InAppTaskPrompt.test.jsx',
    'src/tests/beta-program/task-prompt/TaskCompletionFlow.test.jsx',
    'src/tests/beta-program/task-prompt/TaskPromptUXAudit.test.jsx',
  ]
};

// Flatten test files for running
const allTestFiles = Object.values(testFilesByCategory).flat();

// Results storage
const resultsByCategory = {};
Object.keys(testFilesByCategory).forEach(category => {
  resultsByCategory[category] = {
    passed: [],
    failed: []
  };
});

// Run each test file individually
console.log('Running stability tests...\n');

for (const testFile of allTestFiles) {
  // Determine which category this file belongs to
  const category = Object.keys(testFilesByCategory).find(cat => 
    testFilesByCategory[cat].includes(testFile)
  );
  
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
      resultsByCategory[category].passed.push({ file: testFile, count: result.numPassedTests });
    } else {
      console.log(`❌ FAILED: ${testFile} (${result.numFailedTests} of ${result.numTotalTests} tests failed)`);
      resultsByCategory[category].failed.push({ file: testFile, count: result.numFailedTests });
    }
  } catch (error) {
    console.log(`❌ FAILED: ${testFile} (Error running tests)`);
    resultsByCategory[category].failed.push({ file: testFile, error: error.message });
  }
  
  console.log(''); // Empty line between test files
}

// Print summary
console.log('=== SUMMARY ===');
console.log(`Total files tested: ${allTestFiles.length}`);

let totalPassed = 0;
let totalFailed = 0;

Object.keys(resultsByCategory).forEach(category => {
  const categoryResults = resultsByCategory[category];
  console.log(`\n${category.toUpperCase()}:`);
  console.log(`  Passed: ${categoryResults.passed.length} files`);
  console.log(`  Failed: ${categoryResults.failed.length} files`);
  
  totalPassed += categoryResults.passed.length;
  totalFailed += categoryResults.failed.length;
  
  if (categoryResults.failed.length > 0) {
    console.log(`\n  Failed tests in ${category}:`);
    categoryResults.failed.forEach(failure => {
      console.log(`  - ${failure.file} (${failure.count || 'unknown'} failures)`);
    });
  }
});

console.log(`\nTotal Passed: ${totalPassed} files`);
console.log(`Total Failed: ${totalFailed} files`);

if (totalFailed > 0) {
  process.exit(1);
} else {
  console.log('\nAll tests have passed successfully!');
}

// Save test results to docs folder
const saveResults = () => {
  const resultsBaseDir = 'docs/project_lifecycle/stability_tests/results/data';
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  // Create base directory if it doesn't exist
  if (!fs.existsSync(resultsBaseDir)) {
    fs.mkdirSync(resultsBaseDir, { recursive: true });
  }
  
  // Save combined results
  const combinedResultsFile = `${resultsBaseDir}/stability-test-results-${timestamp}.json`;
  
  // Flatten results for the combined file
  const combinedResults = {
    timestamp: new Date().toISOString(),
    totalFiles: allTestFiles.length,
    passed: Object.values(resultsByCategory).flatMap(r => r.passed),
    failed: Object.values(resultsByCategory).flatMap(r => r.failed),
    summary: {
      passedCount: totalPassed,
      failedCount: totalFailed
    }
  };
  
  fs.writeFileSync(combinedResultsFile, JSON.stringify(combinedResults, null, 2));
  console.log(`\nCombined test results saved to ${combinedResultsFile}`);
  
  // Save category-specific results
  Object.keys(resultsByCategory).forEach(category => {
    // Create category directory if it doesn't exist
    const categoryDir = `${resultsBaseDir}/${category}`;
    if (!fs.existsSync(categoryDir)) {
      fs.mkdirSync(categoryDir, { recursive: true });
    }
    
    const categoryResultsFile = `${categoryDir}/stability-test-results-${timestamp}.json`;
    fs.writeFileSync(
      categoryResultsFile, 
      JSON.stringify({
        timestamp: new Date().toISOString(),
        category,
        totalFiles: testFilesByCategory[category].length,
        passed: resultsByCategory[category].passed,
        failed: resultsByCategory[category].failed,
        summary: {
          passedCount: resultsByCategory[category].passed.length,
          failedCount: resultsByCategory[category].failed.length
        }
      }, null, 2)
    );
    console.log(`${category.charAt(0).toUpperCase() + category.slice(1)} test results saved to ${categoryResultsFile}`);
  });
  
  // Update the last run file
  fs.writeFileSync(
    `${resultsBaseDir}/.last-run.json`,
    JSON.stringify({ lastRun: timestamp }, null, 2)
  );
};

// Save results
saveResults(); 