# PowerShell script to run the Analytics components tests and save the results with timestamp
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$resultsDir = ".\docs\project_lifecycle\all_tests\results\analytics"
$testOutputFile = "$resultsDir\analytics_test_results_$timestamp.txt"
$summaryFile = "$resultsDir\test_summary.md"

# Create directory if it doesn't exist
if (!(Test-Path -Path $resultsDir)) {
    New-Item -ItemType Directory -Path $resultsDir -Force
}

# Run the tests and save the output
Write-Host "Running Analytics components tests..."
npm run test:frontend -- src/tests/components/analytics/* *> $testOutputFile

# Check if the tests passed by looking for "Test Suites: 0 failed" in the output
$testResults = Get-Content $testOutputFile
$testsPassed = $testResults -match "Test Suites: 0 failed" -or $testResults -match "PASS"
$testSummary = if ($testsPassed) { "✅ PASSED" } else { "❌ FAILED" }

# Add a summary message to the results file
Add-Content -Path $testOutputFile -Value "`n`n=== TEST SUMMARY ===`nTest completed at $(Get-Date)`nResult: $testSummary`nSee full details above."

# Update the summary file with the latest test run
$summaryContent = @"
# Analytics Components Test History

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

# Generate statistics
$totalTests = 0
$passedTests = 0
$failedTests = 0

$testStatLines = $testResults -match "Tests:.*"
if ($testStatLines) {
    foreach ($line in $testStatLines) {
        if ($line -match "(\d+) passed, (\d+) failed") {
            $passedTests += [int]$Matches[1]
            $failedTests += [int]$Matches[2]
            $totalTests += [int]$Matches[1] + [int]$Matches[2]
        }
        elseif ($line -match "(\d+) passed") {
            $passedTests += [int]$Matches[1]
            $totalTests += [int]$Matches[1]
        }
    }
}

# Add statistics to the results file
Add-Content -Path $testOutputFile -Value "`n`n=== TEST STATISTICS ===`nTotal tests: $totalTests`nPassed tests: $passedTests`nFailed tests: $failedTests`nSuccess rate: $(if ($totalTests -gt 0) { [math]::Round(($passedTests / $totalTests) * 100, 2) } else { 0 })%"

Write-Host "Test results saved to $testOutputFile"
Write-Host "Test result: $testSummary"
Write-Host "Total tests: $totalTests, Passed: $passedTests, Failed: $failedTests" 