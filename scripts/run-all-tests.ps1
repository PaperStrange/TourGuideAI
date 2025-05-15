# TourGuideAI All Tests Runner
# This script runs all tests (frontend and backend) and generates a comprehensive report

# Enable error handling
$ErrorActionPreference = "Stop"

# Get script directory and project root
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir

Write-Host "=== TourGuideAI Complete Test Suite ===" -ForegroundColor Green
Write-Host "Starting test run at $(Get-Date)" -ForegroundColor Cyan
Write-Host "Project root: $projectRoot" -ForegroundColor Cyan

# Set working directory to project root
Set-Location $projectRoot

# Environment check
Write-Host "`nChecking environment..." -ForegroundColor Yellow
$envChecks = $true

if (-not (Test-Path -Path "server")) {
    Write-Host "Error: Server directory not found." -ForegroundColor Red
    $envChecks = $false
}

if (-not (Test-Path -Path "src")) {
    Write-Host "Error: src directory not found." -ForegroundColor Red
    $envChecks = $false
}

if (-not (Test-Path -Path "tests")) {
    Write-Host "Error: tests directory not found." -ForegroundColor Red
    $envChecks = $false
}

if (-not $envChecks) {
    Write-Host "Environment checks failed. Make sure you're running this from the project root." -ForegroundColor Red
    exit 1
}

# Initialize test results
$testResults = @{
    Frontend = @{
        Status = "Not Run";
        Passed = 0;
        Failed = 0;
        Total = 0;
        ExitCode = -1;
    };
    Backend = @{
        Status = "Not Run";
        Passed = 0;
        Failed = 0;
        Total = 0;
        ExitCode = -1;
    };
}

# Run backend tests
Write-Host "`n=== Running Backend Tests ===" -ForegroundColor Cyan
try {
    Write-Host "Executing server test script..." -ForegroundColor Yellow
    & "$projectRoot\server\tests\run-server-tests.ps1"
    $testResults.Backend.ExitCode = $LASTEXITCODE
    
    if ($LASTEXITCODE -eq 0) {
        $testResults.Backend.Status = "Passed"
        Write-Host "✓ All backend tests passed" -ForegroundColor Green
    } else {
        $testResults.Backend.Status = "Failed"
        Write-Host "✗ Some backend tests failed" -ForegroundColor Red
    }
} catch {
    $testResults.Backend.Status = "Error"
    $testResults.Backend.ExitCode = 999
    Write-Host "✗ Error running backend tests: $_" -ForegroundColor Red
}

# Run frontend tests
Write-Host "`n=== Running Frontend Tests ===" -ForegroundColor Cyan
try {
    Write-Host "Executing frontend test script..." -ForegroundColor Yellow
    & "$projectRoot\tests\run-frontend-tests.ps1"
    $testResults.Frontend.ExitCode = $LASTEXITCODE
    
    if ($LASTEXITCODE -eq 0) {
        $testResults.Frontend.Status = "Passed"
        Write-Host "✓ All frontend tests passed" -ForegroundColor Green
    } else {
        $testResults.Frontend.Status = "Failed"
        Write-Host "✗ Some frontend tests failed" -ForegroundColor Red
    }
} catch {
    $testResults.Frontend.Status = "Error"
    $testResults.Frontend.ExitCode = 999
    Write-Host "✗ Error running frontend tests: $_" -ForegroundColor Red
}

# Generate report
Write-Host "`n=== Test Results Summary ===" -ForegroundColor Cyan
Write-Host "Frontend tests: $($testResults.Frontend.Status)" -ForegroundColor $(if ($testResults.Frontend.Status -eq "Passed") { "Green" } else { "Red" })
Write-Host "Backend tests: $($testResults.Backend.Status)" -ForegroundColor $(if ($testResults.Backend.Status -eq "Passed") { "Green" } else { "Red" })

# Generate test report files
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$date = Get-Date -Format "yyyyMMdd"

# Define paths for results
$resultsBaseDir = "$projectRoot\docs\project_lifecycle\all_tests\results"
$combinedReportPath = "$resultsBaseDir\test-summary-$timestamp.txt"
$frontendReportPath = "$resultsBaseDir\frontend-$date.txt"
$backendReportPath = "$resultsBaseDir\backend-$date.txt"

# Ensure all directories exist
$dirsToCreate = @(
    "$resultsBaseDir",
    "$resultsBaseDir\integration-tests",
    "$resultsBaseDir\playwright-test", 
    "$resultsBaseDir\stability-test",
    "$resultsBaseDir\performance",
    "$resultsBaseDir\user-journey"
)

foreach ($dir in $dirsToCreate) {
    if (-not (Test-Path -Path $dir)) {
        New-Item -Path $dir -ItemType Directory -Force | Out-Null
        Write-Host "Created directory: $dir" -ForegroundColor Yellow
    }
}

# Keep a legacy copy in the test-results directory for backward compatibility
if (-not (Test-Path -Path "$projectRoot\test-results")) {
    New-Item -Path "$projectRoot\test-results" -ItemType Directory | Out-Null
}
$legacyReportPath = "$projectRoot\test-results\test-report-$timestamp.txt"

# Generate main combined report content
$reportContent = @"
TourGuideAI Test Report
=======================
Generated: $(Get-Date)

Overall Status: $(if (($testResults.Frontend.Status -eq "Passed") -and ($testResults.Backend.Status -eq "Passed")) { "PASS" } else { "FAIL" })

Frontend Tests: $($testResults.Frontend.Status)
Backend Tests: $($testResults.Backend.Status)

For detailed test results, refer to:
- Frontend: $frontendReportPath
- Backend: $backendReportPath
"@

# Write combined report
$reportContent | Out-File -FilePath $combinedReportPath -Encoding utf8
# Write legacy report
$reportContent | Out-File -FilePath $legacyReportPath -Encoding utf8

# Write categorized reports
# Frontend report - Save in playwright-test folder since frontend tests use Playwright
$frontendReportDir = "$resultsBaseDir\playwright-test"
if (-not (Test-Path -Path $frontendReportDir)) {
    New-Item -Path $frontendReportDir -ItemType Directory -Force | Out-Null
}
$frontendReportPath = "$frontendReportDir\frontend-tests-$date.txt"

$frontendReportContent = @"
TourGuideAI Frontend Test Report
===============================
Generated: $(Get-Date)

Status: $($testResults.Frontend.Status)

Frontend tests include: Component tests, UI tests, Smoke tests, Cross-browser tests

This report is automatically generated. For detailed results, see the console output.
"@

$frontendReportContent | Out-File -FilePath $frontendReportPath -Encoding utf8

# Backend report - Save in integration-tests folder since most backend tests are integration tests
$backendReportDir = "$resultsBaseDir\integration-tests"
if (-not (Test-Path -Path $backendReportDir)) {
    New-Item -Path $backendReportDir -ItemType Directory -Force | Out-Null
}
$backendReportPath = "$backendReportDir\backend-tests-$date.txt"

$backendReportContent = @"
TourGuideAI Backend Test Report
==============================
Generated: $(Get-Date)

Status: $($testResults.Backend.Status)

Backend tests include: API tests, Database tests, Authentication tests

This report is automatically generated. For detailed results, see the console output.
"@

$backendReportContent | Out-File -FilePath $backendReportPath -Encoding utf8

# Write summaries to appropriate folders
if ($testResults.Frontend.Status -eq "Passed") {
    "PASSED: Frontend smoke tests on $(Get-Date)" | Out-File -FilePath "$resultsBaseDir\smoke-tests-$date.txt" -Encoding utf8
}

Write-Host "`nTest reports saved to:" -ForegroundColor Yellow
Write-Host "- Main report: $combinedReportPath" -ForegroundColor Yellow
Write-Host "- Frontend report: $frontendReportPath" -ForegroundColor Yellow
Write-Host "- Backend report: $backendReportPath" -ForegroundColor Yellow
Write-Host "- Legacy report: $legacyReportPath" -ForegroundColor Yellow

# Set final exit code
$exitCode = 0
if (($testResults.Frontend.ExitCode -ne 0) -or ($testResults.Backend.ExitCode -ne 0)) {
    $exitCode = 1
}

Write-Host "`nTest run completed at $(Get-Date)" -ForegroundColor Cyan
Write-Host "Exit code: $exitCode" -ForegroundColor $(if ($exitCode -eq 0) { "Green" } else { "Red" })
exit $exitCode 