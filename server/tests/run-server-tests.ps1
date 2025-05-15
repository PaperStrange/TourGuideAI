# TourGuideAI Server Tests Runner
# This script runs all server-side tests and generates a report

# Enable error handling
$ErrorActionPreference = "Stop"

Write-Host "=== TourGuideAI Server Tests ===" -ForegroundColor Green
Write-Host "Starting server tests at $(Get-Date)" -ForegroundColor Cyan

# Set working directory to project root - corrected to get the parent of the server folder
$serverDir = Split-Path -Parent $PSScriptRoot
$projectRoot = Split-Path -Parent $serverDir
Write-Host "Script directory: $PSScriptRoot" -ForegroundColor Yellow
Write-Host "Server directory: $serverDir" -ForegroundColor Yellow
Write-Host "Project root: $projectRoot" -ForegroundColor Yellow

Set-Location $projectRoot

# Environment check
Write-Host "Checking environment..." -ForegroundColor Yellow
# Check if we're in the correct directory by looking for key files/folders
$serverJsPath = "$serverDir\server.js"
Write-Host "Looking for server.js at: $serverJsPath" -ForegroundColor Yellow
if (Test-Path -Path $serverJsPath) {
    Write-Host "Found server.js file." -ForegroundColor Green
} else {
    Write-Host "Error: Server main file (server.js) not found at $serverJsPath." -ForegroundColor Red
    Write-Host "Current working directory: $(Get-Location)" -ForegroundColor Yellow
    Write-Host "Project root directory: $projectRoot" -ForegroundColor Yellow
    Write-Host "Listing files in server directory:" -ForegroundColor Yellow
    Get-ChildItem -Path $serverDir -Force | Format-Table Name, Length, LastWriteTime -AutoSize
    exit 1
}

# Run the tests
try {
    Write-Host "Running server tests..." -ForegroundColor Yellow
    
    # Change to server directory
    Set-Location $serverDir
    
    # Find all test files in the tests directory
    $testFilters = @('*.test.js', '*.spec.js')
    $testFiles = @()
    
    foreach ($filter in $testFilters) {
        $testFiles += Get-ChildItem -Path "tests" -Filter $filter | 
                    Where-Object { $_.Name -notmatch "\.skip\.(js|ts)$" } |
                    ForEach-Object { "tests/$($_.Name)" }
    }
    
    Write-Host "Found $($testFiles.Count) test files to run" -ForegroundColor Yellow
    
    # List all test files that will be run
    Write-Host "Test files:" -ForegroundColor Yellow
    foreach ($file in $testFiles) {
        Write-Host "  - $file" -ForegroundColor Yellow
    }
    
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