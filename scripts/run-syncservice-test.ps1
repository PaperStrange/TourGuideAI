# PowerShell script to run the SyncService test and save the results with timestamp
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$resultsDir = ".\docs\project_lifecycle\all_tests\results\sync-service"
$testOutputFile = "$resultsDir\syncservice_test_results_$timestamp.txt"
$summaryFile = "$resultsDir\test_summary.md"

# Create directory if it doesn't exist
if (!(Test-Path -Path $resultsDir)) {
    New-Item -ItemType Directory -Path $resultsDir -Force
}

# Run the test and save the output
Write-Host "Running SyncService tests..."
npm run test:frontend -- src/core/services/storage/SyncService.test.js *> $testOutputFile

# Check if the tests passed by looking for "Test Suites: 0 failed" in the output
$testResults = Get-Content $testOutputFile
$testsPassed = $testResults -match "Test Suites: 0 failed" -or $testResults -match "PASS"
$testSummary = if ($testsPassed) { "✅ PASSED" } else { "❌ FAILED" }

# Add a summary message to the results file
Add-Content -Path $testOutputFile -Value "`n`n=== TEST SUMMARY ===`nTest completed at $(Get-Date)`nResult: $testSummary`nSee full details above."

# Update the summary file with the latest test run
$summaryContent = @"
# SyncService Test History

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

Write-Host "Test results saved to $testOutputFile"
Write-Host "Test result: $testSummary" 