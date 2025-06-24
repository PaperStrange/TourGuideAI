#!/bin/bash

# Enhanced GitHub Tests Runner Script
# Updated with improved Jest configurations and parallel testing

set -e

echo "🚀 TourGuideAI Test Suite - Enhanced Edition"
echo "=============================================="

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Initialize counters
FRONTEND_TESTS_PASSED=0
BACKEND_TESTS_PASSED=0
TOTAL_ERRORS=0

echo "Starting comprehensive test execution..."

# Frontend Tests
echo "Running Frontend Tests..."
echo "========================="

if npm run test:frontend; then
    print_status "Frontend tests completed successfully"
    FRONTEND_TESTS_PASSED=1
else
    print_error "Frontend tests failed"
    TOTAL_ERRORS=$((TOTAL_ERRORS + 1))
fi

echo ""

# Backend Tests  
echo "Running Backend Tests..."
echo "========================"

if npm run test:backend; then
    print_status "Backend tests completed successfully"
    BACKEND_TESTS_PASSED=1
else
    print_error "Backend tests failed"
    TOTAL_ERRORS=$((TOTAL_ERRORS + 1))
fi

echo ""

# Test Summary
echo "Test Execution Summary"
echo "====================="
echo "Frontend Tests: $([ $FRONTEND_TESTS_PASSED -eq 1 ] && echo '✅ PASSED' || echo '❌ FAILED')"
echo "Backend Tests: $([ $BACKEND_TESTS_PASSED -eq 1 ] && echo '✅ PASSED' || echo '❌ FAILED')"
echo "Total Errors: $TOTAL_ERRORS"

if [ $TOTAL_ERRORS -eq 0 ]; then
    print_status "All test suites completed successfully!"
    exit 0
else
    print_error "Some test suites failed. Please review the output above."
    exit 1
fi 