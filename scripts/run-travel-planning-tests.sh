#!/bin/bash

# Travel Planning Feature Test Runner
# This script runs all tests for the Travel Planning feature

# Set colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Print header
echo -e "${YELLOW}=================================${NC}"
echo -e "${YELLOW}Travel Planning Tests Runner${NC}"
echo -e "${YELLOW}=================================${NC}"

# Check environment variables
if [ -z "$OPENAI_API_KEY" ]; then
  echo -e "${RED}Error: OPENAI_API_KEY environment variable not set.${NC}"
  echo "Set it with: export OPENAI_API_KEY=your-api-key"
  exit 1
fi

if [ -z "$GOOGLE_MAPS_API_KEY" ]; then
  echo -e "${YELLOW}Warning: GOOGLE_MAPS_API_KEY environment variable not set.${NC}"
  echo "Some tests may fail. Set it with: export GOOGLE_MAPS_API_KEY=your-api-key"
fi

# Function to run tests and check result
run_test_group() {
  local test_name=$1
  local test_command=$2
  
  echo -e "\n${YELLOW}Running $test_name...${NC}"
  echo -e "Command: $test_command"
  echo -e "${YELLOW}----------------------------------------${NC}"
  
  if eval $test_command; then
    echo -e "${GREEN}✓ $test_name passed!${NC}"
    return 0
  else
    echo -e "${RED}✗ $test_name failed!${NC}"
    return 1
  fi
}

# Track overall status
FAILED_TESTS=0

# 1. Run frontend component tests
run_test_group "Frontend Component Tests" "npm test src/tests/components/travel-planning -- --silent"
FAILED_TESTS=$((FAILED_TESTS + $?))

# 2. Run backend tests
run_test_group "Backend Tests" "npm test server/tests/routeGeneration.test.js server/tests/routeManagement.test.js -- --silent"
FAILED_TESTS=$((FAILED_TESTS + $?))

# 3. Run integration tests
run_test_group "Integration Tests" "npm test src/tests/integration/travel-planning-workflow.test.js -- --silent"
FAILED_TESTS=$((FAILED_TESTS + $?))

# 4. Run end-to-end tests (if Playwright is installed)
if command -v npx &> /dev/null && npx playwright --version &> /dev/null; then
  run_test_group "End-to-End Tests" "npx playwright test tests/cross-browser/travel-planning.spec.js"
  FAILED_TESTS=$((FAILED_TESTS + $?))
else
  echo -e "${YELLOW}Skipping End-to-End Tests: Playwright not installed.${NC}"
  echo "Install with: npm install -D @playwright/test"
fi

# 5. Run load tests (if k6 is installed)
if command -v k6 &> /dev/null; then
  run_test_group "Load Tests" "k6 run -e API_BASE_URL=http://localhost:3000/api tests/load/route-generation-load.js"
  FAILED_TESTS=$((FAILED_TESTS + $?))
else
  echo -e "${YELLOW}Skipping Load Tests: k6 not installed.${NC}"
  echo "Install with: npm install -g k6 (or OS-specific installation)"
fi

# Summary
echo -e "\n${YELLOW}=================================${NC}"
echo -e "${YELLOW}Test Summary${NC}"
echo -e "${YELLOW}=================================${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
  echo -e "${GREEN}All test groups passed!${NC}"
  exit 0
else
  echo -e "${RED}$FAILED_TESTS test group(s) failed!${NC}"
  exit 1
fi 