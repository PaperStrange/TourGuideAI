# PowerShell Test Script Template
# This template follows project best practices for test execution and reporting
# Use this as a starting point for creating new test scripts

# Define test parameters - Change these to match your test
$testName = "example-test"
$testType = "example"
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"

# Always use an existing repository directory for output
# Following the pattern: docs/project_lifecycle/all_tests/results/{test-type}
$resultsDir = ".\docs\project_lifecycle\all_tests\results\$testType"
$testOutputFile = "$resultsDir\$testName-results-$timestamp.txt"
$summaryFile = "$resultsDir\test_summary.md"

# Create directory if it doesn't exist
if (!(Test-Path -Path $resultsDir)) {
    New-Item -ItemType Directory -Path $resultsDir -Force
}

# Begin capturing output
Start-Transcript -Path $testOutputFile -Append
Write-Host "========================================="
Write-Host "$testName Test Runner"
Write-Host "========================================="
Write-Host "Test run started at: $(Get-Date)"
Write-Host "Results being saved to: $testOutputFile"

# Run the tests
Write-Host "Running $testName tests..."

try {
    # Replace this with your actual test command
    # For example: npm run test:frontend -- path/to/tests
    # Example test that always passes:
    Write-Host "Simulating test execution..."
    # Uncomment the line below to simulate test failure
    # throw "Simulated test failure"
    
    $testsPassed = $true
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    $testsPassed = $false
}

# Check if the tests passed
$testSummary = if ($testsPassed) { "✅ PASSED" } else { "❌ FAILED" }

# Add a summary message to the results file
Write-Host "`n========================================="
Write-Host "Test Summary"
Write-Host "========================================="
Write-Host "Result: $testSummary"
if ($testsPassed) {
    Write-Host "All tests passed!" -ForegroundColor Green
} else {
    Write-Host "Tests failed!" -ForegroundColor Red
}

# Stop capturing output
Stop-Transcript

# Update the summary file with the latest test run
$summaryContent = @"
# $($testName.ToUpper()) Test History

| Date | Status | Results File |
|------|--------|-------------|
| $(Get-Date -Format "yyyy-MM-dd HH:mm:ss") | $testSummary | [Results](./$(Split-Path $testOutputFile -Leaf)) |

"@

# If the summary file exists, append to it, otherwise create it
if (Test-Path $summaryFile) {
    $existingContent = Get-Content $summaryFile -Raw
    $headerLines = $existingContent -split "`n" | Select-Object -First 5
    $tableContent = $existingContent -split "`n" | Select-Object -Skip 5
    
    # Create new content with the latest test at the top
    $newContent = $headerLines -join "`n"
    $newContent += "`n| $(Get-Date -Format "yyyy-MM-dd HH:mm:ss") | $testSummary | [Results](./$(Split-Path $testOutputFile -Leaf)) |"
    $newContent += "`n" + ($tableContent -join "`n")
    
    Set-Content -Path $summaryFile -Value $newContent
} else {
    Set-Content -Path $summaryFile -Value $summaryContent
}

# Create latest.txt file to point to most recent results
$latestContent = @"
This file links to the latest test results.
Latest test run: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
Status: $($testsPassed ? "PASSED" : "FAILED")
File: $(Split-Path $testOutputFile -Leaf)
"@

Set-Content -Path "$resultsDir\latest.txt" -Value $latestContent

Write-Host "Test results saved to $testOutputFile"
Write-Host "Summary updated at $summaryFile"

# Exit with appropriate code
if ($testsPassed) {
    exit 0
} else {
    exit 1
} 