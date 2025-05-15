# TourGuideAI Mock Tests Runner
# This script runs tests with mock mode enabled to avoid network dependencies

Write-Host "=== TourGuideAI Mock Tests Runner ===" -ForegroundColor Green
Write-Host "Running tests with mock mode at $(Get-Date)" -ForegroundColor Cyan

# Set working directory to project root
$scriptDir = $PSScriptRoot
Write-Host "Script directory: $scriptDir" -ForegroundColor Yellow
$projectRoot = Split-Path -Parent $scriptDir
Write-Host "Project root: $projectRoot" -ForegroundColor Yellow

Set-Location $projectRoot

# Set test environment variables
$env:CI = 'true'
$env:NODE_ENV = 'test'
$env:TEST_BASE_URL = 'http://mock-tourguideai.test'
Write-Host "Environment variables set for test mode" -ForegroundColor Magenta

# Run TypeScript tests with mocking
Write-Host "`nRunning User Journey TypeScript tests with mocks..." -ForegroundColor Cyan
npx playwright test tests/user-journey/ --config=tests/config/typescript.config.js

# Run the standard test script (which will pick up the environment variables)
Write-Host "`nRunning standard test suite with mocking..." -ForegroundColor Cyan
& "$scriptDir\run-frontend-tests.ps1" 