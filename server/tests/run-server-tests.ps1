# TourGuideAI Server Tests Runner
# This script runs all server-side tests and generates a report

# Enable error handling
$ErrorActionPreference = "Stop"

Write-Host "=== TourGuideAI Server Tests ===" -ForegroundColor Green
Write-Host "Starting server tests at $(Get-Date)" -ForegroundColor Cyan

# Set working directory to project root
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

# Environment check
Write-Host "Checking environment..." -ForegroundColor Yellow
if (-not (Test-Path -Path "server")) {
    Write-Host "Error: Server directory not found. Make sure you're running this from the project root." -ForegroundColor Red
    exit 1
}

# Run the tests
try {
    Write-Host "Running server tests..." -ForegroundColor Yellow
    
    # Change to server directory
    Set-Location "server"
    
    # Run individual test files to prevent issues with failing tests stopping the entire suite
    $testFiles = @(
        "tests/auth.test.js",
        "tests/auth-isolated.test.js",
        "tests/db-connection.test.js",
        "tests/db-schema.test.js",
        "tests/routeGeneration.test.js",
        "tests/routeManagement.test.js"
    )
    
    $failedTests = @()
    $passedTests = @()
    
    foreach ($testFile in $testFiles) {
        Write-Host "Running test: $testFile" -ForegroundColor Cyan
        try {
            npm test -- $testFile
            if ($LASTEXITCODE -eq 0) {
                $passedTests += $testFile
                Write-Host "✓ Test passed: $testFile" -ForegroundColor Green
            } else {
                $failedTests += $testFile
                Write-Host "✗ Test failed: $testFile" -ForegroundColor Red
            }
        } catch {
            $failedTests += $testFile
            Write-Host "✗ Test error: $testFile - $_" -ForegroundColor Red
        }
    }
    
    # Return to project root
    Set-Location $projectRoot
    
    # Summary
    Write-Host "`n=== Test Summary ===" -ForegroundColor Cyan
    Write-Host "Total tests: $($testFiles.Count)" -ForegroundColor White
    Write-Host "Passed: $($passedTests.Count)" -ForegroundColor Green
    Write-Host "Failed: $($failedTests.Count)" -ForegroundColor Red
    
    if ($failedTests.Count -gt 0) {
        Write-Host "`nFailed tests:" -ForegroundColor Red
        foreach ($test in $failedTests) {
            Write-Host " - $test" -ForegroundColor Red
        }
        exit 1
    }
    
} catch {
    Write-Host "Error running tests: $_" -ForegroundColor Red
    exit 1
}

Write-Host "`nServer tests completed at $(Get-Date)" -ForegroundColor Green
exit 0 