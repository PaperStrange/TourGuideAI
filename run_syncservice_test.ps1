# PowerShell script to run the SyncService test and save the results
$testOutputFile = ".\docs\project_lifecycle\stability_tests\results\syncservice_test_results.txt"

# Create directory if it doesn't exist
if (!(Test-Path -Path ".\docs\project_lifecycle\stability_tests\results")) {
    New-Item -ItemType Directory -Path ".\docs\project_lifecycle\stability_tests\results" -Force
}

# Run the test and save the output
npm run test:frontend -- src/core/services/storage/SyncService.test.js *> $testOutputFile

Write-Host "Test results saved to $testOutputFile"

# Add a summary message to the results file
Add-Content -Path $testOutputFile -Value "`n`n=== TEST SUMMARY ===`nTest completed at $(Get-Date)`nSee full details above." 