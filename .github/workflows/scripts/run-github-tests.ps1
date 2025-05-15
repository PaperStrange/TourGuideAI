# TourGuideAI GitHub Actions Test Runner
# This script is a modified version of run-frontend-tests.ps1 optimized for GitHub Actions environment
# It ensures compatibility with Ubuntu runner and outputs test results in a CI-friendly format

# Enable error handling
$ErrorActionPreference = "Stop"

Write-Host "=== TourGuideAI CI/CD Tests ===" -ForegroundColor Green
Write-Host "Starting tests in GitHub Actions at $(Get-Date)" -ForegroundColor Cyan

# Set working directory to project root - fix path resolution
$scriptDir = $PSScriptRoot
Write-Host "Script directory: $scriptDir" -ForegroundColor Yellow

# Fix project root determination for both local and CI environments
if ($scriptDir -like "*\.github\workflows\scripts") {
    # We're running locally or in a normal path structure
    $projectRoot = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $scriptDir))
} else {
    # Fallback for CI environment or unusual path structure
    $projectRoot = Split-Path -Parent (Split-Path -Parent $scriptDir)
}

Write-Host "Project root: $projectRoot" -ForegroundColor Yellow

Set-Location $projectRoot

# Define results directory paths - using the correct established directory structure
$resultsBaseDir = "$projectRoot/docs/project_lifecycle/all_tests/results"
$testResultsDir = "$resultsBaseDir"
$smokeResultsDir = "$resultsBaseDir"
$stabilityResultsDir = "$resultsBaseDir/stability-test" 
$performanceResultsDir = "$resultsBaseDir/performance"
$userJourneyResultsDir = "$resultsBaseDir/user-journey"
$analyticsResultsDir = "$resultsBaseDir/analytics"

# Ensure results directories exist
$dirsToCreate = @(
    $resultsBaseDir,
    $testResultsDir,
    $stabilityResultsDir,
    $performanceResultsDir,
    $userJourneyResultsDir,
    $analyticsResultsDir
)

foreach ($dir in $dirsToCreate) {
    if (-not (Test-Path -Path $dir)) {
        New-Item -Path $dir -ItemType Directory -Force | Out-Null
        Write-Host "Created directory: $dir" -ForegroundColor Yellow
    }
}

# Environment check
Write-Host "Checking environment..." -ForegroundColor Yellow
$srcPath = "$projectRoot/src"
Write-Host "Looking for src directory at: $srcPath" -ForegroundColor Yellow
if (Test-Path -Path $srcPath) {
    Write-Host "Found src directory." -ForegroundColor Green
} else {
    Write-Host "Error: src directory not found at $srcPath." -ForegroundColor Red
    Write-Host "Current working directory: $(Get-Location)" -ForegroundColor Yellow
    Write-Host "Project root directory: $projectRoot" -ForegroundColor Yellow
    exit 1
}

# Run the tests
try {
    Write-Host "Running tests in CI/CD environment..." -ForegroundColor Yellow
    
    # Test categories with their respective directories
    $testCategories = @{
        "Stability Tests" = "src/tests/stability";
        "Component Tests" = "src/tests/components";
        "API Tests" = "src/tests/api";
        "Integration Tests" = "src/tests/integration";
        "Smoke Tests" = "tests/smoke";
        "Security Tests" = "tests/security";
        "Analytics Tests" = "src/tests/components/analytics";
        # Removed "User Journey Tests" category for CI/CD to improve build speed
    }
    
    $testResults = @{
        Total = 0;
        Passed = 0;
        Failed = 0;
        Skipped = 0;
        CategoryResults = @{}
    }
    
    $failedTests = @()
    
    foreach ($category in $testCategories.Keys) {
        $categoryDir = $testCategories[$category]
        $categoryTests = @{
            Total = 0;
            Passed = 0;
            Failed = 0;
            Skipped = 0;
            Files = @()
        }
        
        if (Test-Path -Path $categoryDir) {
            Write-Host "`nRunning $category..." -ForegroundColor Cyan
            
            # Define filter patterns for different test file types
            $testFilters = @(
                '*.test.js', '*.spec.js', '*-test.js',  # JavaScript test files
                '*.test.ts', '*.spec.ts', '*-test.ts'   # TypeScript test files
            )
            $testFiles = @()
            
            # Get all test files in the directory (excluding .skip files)
            foreach ($filter in $testFilters) {
                $testFiles += Get-ChildItem -Path $categoryDir -Recurse -Filter $filter | 
                              Where-Object { $_.Name -notmatch "\.skip\.(js|ts)$" } |
                              ForEach-Object { $_.FullName }
            }
            
            # Count skipped tests
            $skippedTests = 0
            foreach ($filter in $testFilters) {
                $skipFilter = ($filter.Replace(".", ".skip."))
                $skippedTests += (Get-ChildItem -Path $categoryDir -Recurse -Filter $skipFilter | 
                               Measure-Object | Select-Object -ExpandProperty Count)
            }
            $testResults.Skipped += $skippedTests
            $categoryTests.Skipped = $skippedTests
            
            if ($testFiles.Count -eq 0) {
                Write-Host "  No test files found in $categoryDir" -ForegroundColor Yellow
                continue
            }
            
            $testResults.Total += $testFiles.Count
            $categoryTests.Total = $testFiles.Count
            
            foreach ($testFile in $testFiles) {
                $relativeTestFile = $testFile.Replace("$projectRoot/", "").Replace("\", "/")
                Write-Host "`n  Running test: $relativeTestFile" -ForegroundColor White
                $categoryTests.Files += $relativeTestFile
                
                # Special handling for load-test.js files which require k6
                if ($relativeTestFile -like "*load-test.js") {
                    # In CI environment, use k6 directly if available
                    if (Get-Command "k6" -ErrorAction SilentlyContinue) {
                        try {
                            # Run k6 load test
                            k6 run $testFile
                            $testExitCode = $LASTEXITCODE
                            
                            if ($testExitCode -eq 0) {
                                $testResults.Passed++
                                $categoryTests.Passed++
                                Write-Host "  ✓ Load test passed: $relativeTestFile" -ForegroundColor Green
                            } else {
                                $testResults.Failed++
                                $categoryTests.Failed++
                                $failedTests += $relativeTestFile
                                Write-Host "  ✗ Load test failed: $relativeTestFile" -ForegroundColor Red
                            }
                        } catch {
                            $testResults.Failed++
                            $categoryTests.Failed++
                            $failedTests += $relativeTestFile
                            Write-Host "  ✗ Load test error: $relativeTestFile - $_" -ForegroundColor Red
                        }
                    } else {
                        Write-Host "  ℹ️ Skipping k6 load test (k6 not available): $relativeTestFile" -ForegroundColor Cyan
                        $testResults.Skipped++
                        $categoryTests.Skipped++
                    }
                    continue
                }
                
                # Run tests using Jest
                try {
                    $env:CI = $true  # Ensure CI mode is enabled
                    
                    # Use regular npm test for tests
                    Write-Host "  Test details: " -ForegroundColor Cyan
                    
                    if ($relativeTestFile -like "*.ts") {
                        # TypeScript-specific Jest configuration with ts-node support
                        Write-Host "  Running TypeScript test with Jest..." -ForegroundColor Cyan
                        
                        # Ensure ts-node is installed for TypeScript support
                        if (-not (Test-Path -Path "node_modules/.bin/ts-node")) {
                            Write-Host "  Installing ts-node for TypeScript support..." -ForegroundColor Cyan
                            npm install --no-save ts-node typescript @types/node @playwright/test
                        }
                        
                        # Run TypeScript tests with ts-node
                        if ($relativeTestFile -like "*.spec.ts") {
                            # Skip user journey TypeScript tests in GitHub CI
                            if ($relativeTestFile -like "tests/user-journey/*.spec.ts") {
                                Write-Host "  Skipping user journey TypeScript test in CI: $relativeTestFile" -ForegroundColor Yellow
                                $testResults.Skipped++
                                $categoryTests.Skipped++
                                continue
                            }
                            
                            # For other Playwright tests
                            # Convert Windows path to glob pattern
                            $globPattern = $relativeTestFile.Replace("\", "/")
                            
                            # Always enforce mock mode for TypeScript tests in GitHub CI
                            $env:CI = 'true'
                            $env:NODE_ENV = 'test'
                            $env:TEST_BASE_URL = 'http://mock-tourguideai.test'
                            
                            if (Test-Path -Path "tests/config/typescript.config.js") {
                                Write-Host "  Using TypeScript configuration with mock mode" -ForegroundColor Yellow
                                npx playwright test $globPattern --config=tests/config/typescript.config.js --reporter=dot
                            } else {
                                npx playwright test $globPattern --reporter=dot
                            }
                        } else {
                            # For Jest tests
                            npm test -- "$relativeTestFile" --no-watch --ci --testMatch="**/*.ts"
                        }
                    } else {
                        # Regular JavaScript files
                        npm test -- $relativeTestFile --no-watch --ci
                    }
                    
                    $testExitCode = $LASTEXITCODE
                    
                    if ($testExitCode -eq 0) {
                        $testResults.Passed++
                        $categoryTests.Passed++
                        Write-Host "  ✓ Test passed: $relativeTestFile" -ForegroundColor Green
                    } else {
                        $testResults.Failed++
                        $categoryTests.Failed++
                        $failedTests += $relativeTestFile
                        Write-Host "  ✗ Test failed: $relativeTestFile" -ForegroundColor Red
                    }
                } catch {
                    $testResults.Failed++
                    $categoryTests.Failed++
                    $failedTests += $relativeTestFile
                    Write-Host "  ✗ Test error: $relativeTestFile - $_" -ForegroundColor Red
                }
            }
        } else {
            Write-Host "  Directory not found: $categoryDir" -ForegroundColor Yellow
        }
        
        $testResults.CategoryResults[$category] = $categoryTests
    }
    
    # Summary
    Write-Host "`n=== Test Summary ===" -ForegroundColor Cyan
    Write-Host "Total tests: $($testResults.Total)" -ForegroundColor White
    Write-Host "Passed: $($testResults.Passed)" -ForegroundColor Green
    Write-Host "Failed: $($testResults.Failed)" -ForegroundColor Red
    Write-Host "Skipped: $($testResults.Skipped)" -ForegroundColor Yellow
    
    # Create test reports
    $timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
    $date = Get-Date -Format "yyyyMMdd"
    
    # Generate main report 
    $mainReportPath = "$resultsBaseDir/test-summary-$date.txt"
    
    # Build report content
    $reportContent = "TourGuideAI Test Report`n"
    $reportContent += "===============================`n"
    $reportContent += "Generated: $(Get-Date)`n`n"
    $reportContent += "==== Summary ====`n"
    $reportContent += "Total tests: $($testResults.Total)`n"
    $reportContent += "Passed: $($testResults.Passed)`n"
    $reportContent += "Failed: $($testResults.Failed)`n"
    $reportContent += "Skipped: $($testResults.Skipped)`n`n"
    $reportContent += "==== Test Categories ====`n"
    
    foreach ($category in $testResults.CategoryResults.Keys) {
        $categoryResult = $testResults.CategoryResults[$category]
        $reportContent += "`n${category}:`n"
        $reportContent += "  Total: $($categoryResult.Total)`n"
        $reportContent += "  Passed: $($categoryResult.Passed)`n"
        $reportContent += "  Failed: $($categoryResult.Failed)`n"
        $reportContent += "  Skipped: $($categoryResult.Skipped)`n"
    }
    
    if ($failedTests.Count -gt 0) {
        $reportContent += "`n==== Failed Tests ====`n"
        foreach ($test in $failedTests) {
            $reportContent += "- $test`n"
        }
    }
    
    # Write main report
    $reportContent | Out-File -FilePath $mainReportPath -Encoding utf8
    
    # Generate category-specific reports
    foreach ($category in $testResults.CategoryResults.Keys) {
        $categoryResult = $testResults.CategoryResults[$category]
        
        # Skip empty categories
        if ($categoryResult.Total -eq 0) {
            continue
        }
        
        # Determine which directory to use for this category
        $categoryReportDir = $resultsBaseDir
        $categoryFileName = $category.Replace(' ', '-').ToLower() + "-tests-$date.txt"
        
        switch -Wildcard ($category) {
            "Smoke*" { 
                $categoryReportDir = $smokeResultsDir 
                $categoryFileName = "smoke-tests-$date.txt"
            }
            "Stability*" { 
                $categoryReportDir = $stabilityResultsDir 
                $categoryFileName = "stability-tests-$date.txt"
            }
            "User Journey*" { 
                $categoryReportDir = $userJourneyResultsDir 
                $categoryFileName = "user-journey-tests-$date.txt"
            }
            "Performance*" { 
                $categoryReportDir = $performanceResultsDir 
                $categoryFileName = "performance-tests-$date.txt"
            }
            "Analytics*" {
                $categoryReportDir = $analyticsResultsDir
                $categoryFileName = "analytics-tests-$date.txt"
            }
        }
        
        $categoryReportPath = "$categoryReportDir/$categoryFileName"
        
        # Build category report content
        $categoryReportContent = "TourGuideAI Test Report - $category`n"
        $categoryReportContent += "============================================`n"
        $categoryReportContent += "Generated: $(Get-Date)`n`n"
        $categoryReportContent += "==== Summary ====`n"
        $categoryReportContent += "Total tests: $($categoryResult.Total)`n"
        $categoryReportContent += "Passed: $($categoryResult.Passed)`n"
        $categoryReportContent += "Failed: $($categoryResult.Failed)`n"
        $categoryReportContent += "Skipped: $($categoryResult.Skipped)`n`n"
        $categoryReportContent += "==== Test Files ====`n"
        
        foreach ($file in $categoryResult.Files) {
            $categoryReportContent += "- $file`n"
        }
        
        # Write category report
        $categoryReportContent | Out-File -FilePath $categoryReportPath -Encoding utf8
    }
    
    # Special handling for GitHub Actions - create step summary
    if ($env:GITHUB_STEP_SUMMARY) {
        $githubSummary = "## TourGuideAI Test Results`n`n"
        $githubSummary += "| Test Category | Total | Passed | Failed | Skipped |`n"
        $githubSummary += "|:-------------|------:|-------:|-------:|--------:|`n"
        
        foreach ($category in $testResults.CategoryResults.Keys) {
            $categoryResult = $testResults.CategoryResults[$category]
            if ($categoryResult.Total -gt 0) {
                $githubSummary += "| $category | $($categoryResult.Total) | $($categoryResult.Passed) | $($categoryResult.Failed) | $($categoryResult.Skipped) |`n"
            }
        }
        
        $githubSummary += "`n**Overall Results**: $($testResults.Passed)/$($testResults.Total) tests passed`n"
        
        if ($failedTests.Count -gt 0) {
            $githubSummary += "`n### Failed Tests`n`n"
            foreach ($test in $failedTests) {
                $githubSummary += "- $test`n"
            }
        }
        
        $githubSummary | Out-File -FilePath $env:GITHUB_STEP_SUMMARY -Encoding utf8 -Append
    }
    
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

Write-Host "`nTests completed at $(Get-Date)" -ForegroundColor Green
exit 0 