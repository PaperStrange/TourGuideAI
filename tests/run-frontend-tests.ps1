# TourGuideAI Frontend Tests Runner
# This script runs all frontend tests and generates a report

# Enable error handling
$ErrorActionPreference = "Stop"

Write-Host "=== TourGuideAI Frontend Tests ===" -ForegroundColor Green
Write-Host "Starting frontend tests at $(Get-Date)" -ForegroundColor Cyan

# Set working directory to project root
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

# Environment check
Write-Host "Checking environment..." -ForegroundColor Yellow
if (-not (Test-Path -Path "src")) {
    Write-Host "Error: src directory not found. Make sure you're running this from the project root." -ForegroundColor Red
    exit 1
}

# Run the tests
try {
    Write-Host "Running frontend tests..." -ForegroundColor Yellow
    
    # Test categories with their respective directories
    $testCategories = @{
        "API Tests" = "src/tests/api";
        "Component Tests" = "src/tests/components";
        "Integration Tests" = "src/tests/integration";
        "Stability Tests" = "src/tests/stability";
    }
    
    $testResults = @{
        Total = 0;
        Passed = 0;
        Failed = 0;
        Skipped = 0;
    }
    
    $failedTests = @()
    
    foreach ($category in $testCategories.Keys) {
        $categoryDir = $testCategories[$category]
        
        if (Test-Path -Path $categoryDir) {
            Write-Host "`nRunning $category..." -ForegroundColor Cyan
            
            # Get all test files in the directory (excluding .skip files)
            $testFiles = Get-ChildItem -Path $categoryDir -Recurse -Filter "*.test.js" | 
                        Where-Object { $_.Name -notmatch "\.skip\.js$" } |
                        ForEach-Object { $_.FullName }
            
            # Count skipped tests
            $skippedTests = Get-ChildItem -Path $categoryDir -Recurse -Filter "*.test.js.skip" | 
                           Measure-Object | Select-Object -ExpandProperty Count
            $testResults.Skipped += $skippedTests
            
            if ($testFiles.Count -eq 0) {
                Write-Host "  No test files found in $categoryDir" -ForegroundColor Yellow
                continue
            }
            
            $testResults.Total += $testFiles.Count
            
            foreach ($testFile in $testFiles) {
                $relativeTestFile = $testFile.Replace("$projectRoot\", "")
                Write-Host "  Running test: $relativeTestFile" -ForegroundColor White
                
                try {
                    # Run test with Jest
                    $env:CI = $true  # Disable watch mode
                    $testOutput = npm test -- $relativeTestFile --no-watch
                    
                    if ($LASTEXITCODE -eq 0) {
                        $testResults.Passed++
                        Write-Host "  ✓ Test passed: $relativeTestFile" -ForegroundColor Green
                    } else {
                        $testResults.Failed++
                        $failedTests += $relativeTestFile
                        Write-Host "  ✗ Test failed: $relativeTestFile" -ForegroundColor Red
                    }
                } catch {
                    $testResults.Failed++
                    $failedTests += $relativeTestFile
                    Write-Host "  ✗ Test error: $relativeTestFile - $_" -ForegroundColor Red
                }
            }
        } else {
            Write-Host "  Directory not found: $categoryDir" -ForegroundColor Yellow
        }
    }
    
    # Summary
    Write-Host "`n=== Test Summary ===" -ForegroundColor Cyan
    Write-Host "Total tests: $($testResults.Total)" -ForegroundColor White
    Write-Host "Passed: $($testResults.Passed)" -ForegroundColor Green
    Write-Host "Failed: $($testResults.Failed)" -ForegroundColor Red
    Write-Host "Skipped: $($testResults.Skipped)" -ForegroundColor Yellow
    
    if ($testResults.Failed -gt 0) {
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

Write-Host "`nFrontend tests completed at $(Get-Date)" -ForegroundColor Green
exit 0 