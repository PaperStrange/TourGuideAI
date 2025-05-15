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

# Generate test report file
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$reportPath = "$projectRoot\test-results\test-report-$timestamp.txt"

# Create directory if it doesn't exist
if (-not (Test-Path -Path "$projectRoot\test-results")) {
    New-Item -Path "$projectRoot\test-results" -ItemType Directory | Out-Null
}

# Write report
$reportContent = @"
TourGuideAI Test Report
=======================
Generated: $(Get-Date)

Overall Status: $(if (($testResults.Frontend.Status -eq "Passed") -and ($testResults.Backend.Status -eq "Passed")) { "PASS" } else { "FAIL" })

Frontend Tests: $($testResults.Frontend.Status)
Backend Tests: $($testResults.Backend.Status)

For detailed test results, refer to the console output or individual test log files.
"@

$reportContent | Out-File -FilePath $reportPath -Encoding utf8
Write-Host "`nTest report saved to: $reportPath" -ForegroundColor Yellow

# Set final exit code
$exitCode = 0
if (($testResults.Frontend.ExitCode -ne 0) -or ($testResults.Backend.ExitCode -ne 0)) {
    $exitCode = 1
}

Write-Host "`nTest run completed at $(Get-Date)" -ForegroundColor Cyan
Write-Host "Exit code: $exitCode" -ForegroundColor $(if ($exitCode -eq 0) { "Green" } else { "Red" })
exit $exitCode 