const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Categories for test organization
const testCategories = {
  'core-app': ['src/tests/pages', 'src/tests/stability', 'src/tests/components/**/*.test.js'],
  'beta-program': [
    'src/tests/components/analytics', 
    'src/tests/components/survey', 
    'src/tests/components/onboarding',
    'src/tests/beta-program'
  ],
  'travel-planning': ['src/tests/components/travel-planning', 'server/tests/routeGeneration.test.js', 'server/tests/routeManagement.test.js'],
  'server': ['server/tests'],
};

// Function to discover all test files based on patterns
function findTestFiles(patterns) {
  const files = [];
  patterns.forEach(pattern => {
    if (pattern.endsWith('.js')) {
      // Direct file reference
      if (fs.existsSync(pattern)) {
        files.push(pattern);
      }
    } else {
      // Directory or glob pattern
      let searchPattern = pattern;
      if (!pattern.includes('*')) {
        // If it's a directory, add the test file pattern
        searchPattern = path.join(pattern, '**/*.test.js');
      }
      const matchedFiles = glob.sync(searchPattern);
      files.push(...matchedFiles);
    }
  });
  return [...new Set(files)]; // Remove duplicates
}

// Discover all test files for each category
const testFilesByCategory = {};
Object.keys(testCategories).forEach(category => {
  testFilesByCategory[category] = findTestFiles(testCategories[category]);
});

// Find all unique test files
const allTestFiles = [...new Set(Object.values(testFilesByCategory).flat())];

// Structure for storing results
const resultsByCategory = {};
Object.keys(testFilesByCategory).forEach(category => {
  resultsByCategory[category] = {
    passed: [],
    failed: [],
    skipped: []
  };
});

// Run each test file individually
console.log(`Running stability tests on ${allTestFiles.length} test files...\n`);

for (const testFile of allTestFiles) {
  // Determine which category this file belongs to
  const category = Object.keys(testFilesByCategory).find(cat => 
    testFilesByCategory[cat].includes(testFile)
  ) || 'uncategorized';
  
  // Ensure category exists in results
  if (!resultsByCategory[category]) {
    resultsByCategory[category] = {
      passed: [],
      failed: [],
      skipped: []
    };
  }
  
  // Check if file exists
  if (!fs.existsSync(testFile)) {
    console.log(`SKIPPED: ${testFile} (File not found)`);
    continue;
  }

  // Check for skipped tests by reading file content
  const fileContent = fs.readFileSync(testFile, 'utf8');
  const skippedTestsCount = (fileContent.match(/test\.skip|it\.skip|describe\.skip/g) || []).length;
  
  if (skippedTestsCount > 0) {
    console.log(`⚠️ SKIPPED TESTS: ${testFile} contains ${skippedTestsCount} skipped tests`);
    resultsByCategory[category].skipped.push({ 
      file: testFile, 
      count: skippedTestsCount 
    });
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
let totalSkipped = 0;

Object.keys(resultsByCategory).forEach(category => {
  const categoryResults = resultsByCategory[category];
  console.log(`\n${category.toUpperCase()}:`);
  console.log(`  Passed: ${categoryResults.passed.length} files`);
  console.log(`  Failed: ${categoryResults.failed.length} files`);
  console.log(`  Files with skipped tests: ${categoryResults.skipped.length} files`);
  
  totalPassed += categoryResults.passed.length;
  totalFailed += categoryResults.failed.length;
  totalSkipped += categoryResults.skipped.length;
  
  if (categoryResults.failed.length > 0) {
    console.log(`\n  Failed tests in ${category}:`);
    categoryResults.failed.forEach(failure => {
      console.log(`  - ${failure.file} (${failure.count || 'unknown'} failures)`);
    });
  }
  
  if (categoryResults.skipped.length > 0) {
    console.log(`\n  Skipped tests in ${category}:`);
    categoryResults.skipped.forEach(skipped => {
      console.log(`  - ${skipped.file} (${skipped.count} skipped tests)`);
    });
  }
});

console.log(`\nTotal Passed: ${totalPassed} files`);
console.log(`Total Failed: ${totalFailed} files`);
console.log(`Total Files with Skipped Tests: ${totalSkipped} files`);

if (totalFailed > 0) {
  process.exit(1);
} else {
  console.log('\nAll tests have passed successfully!');
}

// Save test results to docs folder
const saveResults = () => {
  const resultsBaseDir = 'docs/project_lifecycle/all_tests/results/data';
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
    skipped: Object.values(resultsByCategory).flatMap(r => r.skipped),
    summary: {
      passedCount: totalPassed,
      failedCount: totalFailed,
      skippedCount: totalSkipped
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
        skipped: resultsByCategory[category].skipped,
        summary: {
          passedCount: resultsByCategory[category].passed.length,
          failedCount: resultsByCategory[category].failed.length,
          skippedCount: resultsByCategory[category].skipped.length
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