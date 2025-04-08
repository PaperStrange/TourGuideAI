const fs = require('fs');
const path = require('path');

/**
 * Generates an HTML report of all stability tests
 */
function generateTestReport() {
  const resultsDir = 'docs/project_lifecycle/stability_tests/results/data';
  const outputDir = 'docs/project_lifecycle/stability_tests/results/reports';
  
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Get the latest test run timestamp
  const lastRunFile = path.join(resultsDir, '.last-run.json');
  if (!fs.existsSync(lastRunFile)) {
    console.error('No test runs found. Run stability tests first.');
    process.exit(1);
  }
  
  const lastRun = JSON.parse(fs.readFileSync(lastRunFile, 'utf8')).lastRun;
  console.log(`Generating report for test run: ${lastRun}`);
  
  // Read combined results
  const combinedResultsFile = path.join(resultsDir, `stability-test-results-${lastRun}.json`);
  if (!fs.existsSync(combinedResultsFile)) {
    console.error(`Results file not found: ${combinedResultsFile}`);
    process.exit(1);
  }
  
  const combinedResults = JSON.parse(fs.readFileSync(combinedResultsFile, 'utf8'));
  
  // Read category results
  const categories = ['core-app', 'beta-program', 'ux-audit', 'task-prompt'];
  const categoryResults = {};
  
  categories.forEach(category => {
    const categoryResultsFile = path.join(resultsDir, category, `stability-test-results-${lastRun}.json`);
    if (fs.existsSync(categoryResultsFile)) {
      categoryResults[category] = JSON.parse(fs.readFileSync(categoryResultsFile, 'utf8'));
    }
  });
  
  // Calculate totals
  const totalTests = combinedResults.passed.reduce((sum, file) => sum + file.count, 0) + 
                     combinedResults.failed.reduce((sum, file) => sum + (file.count || 0), 0);
  
  const totalPassedTests = combinedResults.passed.reduce((sum, file) => sum + file.count, 0);
  const passPercentage = totalTests > 0 ? Math.round((totalPassedTests / totalTests) * 100) : 0;
  
  // Generate HTML report
  const html = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Stability Test Report - ${new Date(combinedResults.timestamp).toLocaleString()}</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        line-height: 1.6;
        color: #333;
        max-width: 1200px;
        margin: 0 auto;
        padding: 20px;
      }
      h1, h2, h3 {
        color: #2c3e50;
      }
      .summary-box {
        display: flex;
        justify-content: space-between;
        margin-bottom: 30px;
      }
      .summary-card {
        flex: 1;
        margin: 0 10px;
        padding: 15px;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      }
      .card-green {
        background-color: #d4edda;
        border-left: 5px solid #28a745;
      }
      .card-red {
        background-color: #f8d7da;
        border-left: 5px solid #dc3545;
      }
      .card-blue {
        background-color: #cce5ff;
        border-left: 5px solid #007bff;
      }
      .big-number {
        font-size: 36px;
        font-weight: bold;
        margin: 10px 0;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 30px;
      }
      th, td {
        padding: 12px 15px;
        text-align: left;
        border-bottom: 1px solid #ddd;
      }
      th {
        background-color: #f8f9fa;
        font-weight: bold;
      }
      tr:hover {
        background-color: #f1f1f1;
      }
      .badge {
        display: inline-block;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: bold;
        text-transform: uppercase;
      }
      .badge-success {
        background-color: #28a745;
        color: white;
      }
      .badge-danger {
        background-color: #dc3545;
        color: white;
      }
      .progress-container {
        width: 100%;
        height: 20px;
        background-color: #f1f1f1;
        border-radius: 10px;
        margin: 10px 0;
      }
      .progress-bar {
        height: 20px;
        background-color: #4CAF50;
        border-radius: 10px;
      }
    </style>
  </head>
  <body>
    <h1>Stability Test Report</h1>
    <p>Generated on: ${new Date(combinedResults.timestamp).toLocaleString()}</p>
    
    <div class="summary-box">
      <div class="summary-card card-blue">
        <h3>Total Files</h3>
        <div class="big-number">${combinedResults.totalFiles}</div>
      </div>
      <div class="summary-card card-green">
        <h3>Passed Files</h3>
        <div class="big-number">${combinedResults.passed.length}</div>
      </div>
      <div class="summary-card card-red">
        <h3>Failed Files</h3>
        <div class="big-number">${combinedResults.failed.length}</div>
      </div>
    </div>
    
    <h2>Test Coverage</h2>
    <div class="progress-container">
      <div class="progress-bar" style="width: ${passPercentage}%"></div>
    </div>
    <p><strong>${passPercentage}%</strong> of tests passing (${totalPassedTests} of ${totalTests} tests)</p>
    
    <h2>Results by Category</h2>
    ${categories.map(category => {
      const results = categoryResults[category];
      if (!results) return `<p>No results found for ${category}</p>`;
      
      return `
        <h3>${category.charAt(0).toUpperCase() + category.slice(1).replace('-', ' ')}</h3>
        <table>
          <thead>
            <tr>
              <th>File</th>
              <th>Status</th>
              <th>Tests</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            ${results.passed.map(file => `
              <tr>
                <td>${file.file}</td>
                <td><span class="badge badge-success">Passed</span></td>
                <td>${file.count}</td>
                <td>All tests passed</td>
              </tr>
            `).join('')}
            ${results.failed.map(file => `
              <tr>
                <td>${file.file}</td>
                <td><span class="badge badge-danger">Failed</span></td>
                <td>${file.count || 'Unknown'}</td>
                <td>${file.error || 'Some tests failed'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }).join('')}
    
    <h2>Test Execution Details</h2>
    <table>
      <thead>
        <tr>
          <th>File</th>
          <th>Status</th>
          <th>Tests</th>
        </tr>
      </thead>
      <tbody>
        ${combinedResults.passed.map(file => `
          <tr>
            <td>${file.file}</td>
            <td><span class="badge badge-success">Passed</span></td>
            <td>${file.count}</td>
          </tr>
        `).join('')}
        ${combinedResults.failed.map(file => `
          <tr>
            <td>${file.file}</td>
            <td><span class="badge badge-danger">Failed</span></td>
            <td>${file.count || 'Unknown'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    
    <footer>
      <p>Test report generated at ${new Date().toLocaleString()}</p>
      <p><a href="../data/stability-test-results-${lastRun}.json">View raw test data</a></p>
    </footer>
  </body>
  </html>
  `;
  
  // Write report to file
  const outputFile = path.join(outputDir, `stability-test-report-${lastRun}.html`);
  fs.writeFileSync(outputFile, html);
  
  // Create a latest.html that redirects to the most recent report
  const latestHtml = `
  <!DOCTYPE html>
  <html>
    <head>
      <meta http-equiv="refresh" content="0; url='./stability-test-report-${lastRun}.html'" />
    </head>
    <body>
      <p>Redirecting to latest report...</p>
    </body>
  </html>
  `;
  
  fs.writeFileSync(path.join(outputDir, 'latest.html'), latestHtml);
  
  // Also create a simple index.html for the main results directory
  const indexHtml = `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Stability Test Results</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }
        h1, h2 {
          color: #2c3e50;
        }
        .card {
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 20px;
          background-color: #f9f9f9;
        }
        .btn {
          display: inline-block;
          background-color: #007bff;
          color: white;
          padding: 10px 15px;
          text-decoration: none;
          border-radius: 4px;
          font-weight: bold;
        }
        .btn:hover {
          background-color: #0056b3;
        }
      </style>
    </head>
    <body>
      <h1>Stability Test Results</h1>
      
      <div class="card">
        <h2>Test Reports</h2>
        <p>View interactive HTML reports with detailed test results:</p>
        <a class="btn" href="./reports/latest.html">View Latest Report</a>
      </div>
      
      <div class="card">
        <h2>Raw Data</h2>
        <p>Access the raw JSON test data:</p>
        <a class="btn" href="./data/stability-test-results-${lastRun}.json">View Latest Data</a>
      </div>
    </body>
  </html>
  `;
  
  fs.writeFileSync(path.join('docs/project_lifecycle/stability_tests/results', 'index.html'), indexHtml);
  
  console.log(`Report generated: ${outputFile}`);
  console.log(`Latest report link: ${path.join(outputDir, 'latest.html')}`);
  console.log(`Main index created: docs/project_lifecycle/stability_tests/results/index.html`);
}

// Run the report generator
generateTestReport(); 