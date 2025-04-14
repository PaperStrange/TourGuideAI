#!/bin/bash

# Travel Planning Feature Test Runner
# This script runs all tests for the Travel Planning feature

# Set colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Set output directory
OUTPUT_DIR="./docs/project_lifecycle/all_tests/results/travel-planning"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
RESULTS_FILE="${OUTPUT_DIR}/travel-planning-results-${TIMESTAMP}.txt"

# Create output directory if it doesn't exist
mkdir -p "${OUTPUT_DIR}"

# Start capturing output
exec > >(tee -a "${RESULTS_FILE}") 2>&1

# Print header
echo -e "${YELLOW}=================================${NC}"
echo -e "${YELLOW}Travel Planning Tests Runner${NC}"
echo -e "${YELLOW}=================================${NC}"
echo "Test run started at: $(date)"
echo "Results being saved to: ${RESULTS_FILE}"

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

# Function to check for skipped tests
check_skipped_tests() {
  local directory=$1
  local pattern=${2:-"*.test.js"}
  local skipped_count=0
  local skipped_files=()
  
  echo -e "\n${BLUE}Checking for skipped tests in $directory/$pattern...${NC}"
  
  # Find all test files
  local test_files=$(find "$directory" -name "$pattern" 2>/dev/null)
  
  # Check each file for skipped tests
  for file in $test_files; do
    local skip_count=$(grep -c "\.(skip|xdescribe|xit|xtest)" "$file" 2>/dev/null)
    if [ "$skip_count" -gt 0 ]; then
      skipped_count=$((skipped_count + skip_count))
      skipped_files+=("$file ($skip_count skipped tests)")
    fi
  done
  
  if [ ${#skipped_files[@]} -gt 0 ]; then
    echo -e "${YELLOW}Found ${skipped_count} skipped tests in ${#skipped_files[@]} files:${NC}"
    for file in "${skipped_files[@]}"; do
      echo -e "  - $file"
    done
  else
    echo -e "${GREEN}No skipped tests found.${NC}"
  fi
}

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

# 1. Run frontend component tests (using wildcard to find all test files)
run_test_group "Frontend Component Tests" "npm test src/tests/components/travel-planning/**/*.test.js -- --silent"
FAILED_TESTS=$((FAILED_TESTS + $?))

# 2. Run backend tests (using wildcard to find all test files)
run_test_group "Backend Tests" "npm test server/tests/route*.test.js -- --silent"
FAILED_TESTS=$((FAILED_TESTS + $?))

# 3. Run integration tests
run_test_group "Integration Tests" "npm test src/tests/integration/travel-planning*.test.js -- --silent"
FAILED_TESTS=$((FAILED_TESTS + $?))

# 4. Run end-to-end tests (if Playwright is installed)
if command -v npx &> /dev/null && npx playwright --version &> /dev/null; then
  run_test_group "End-to-End Tests" "npx playwright test tests/cross-browser/specs/*travel-planning*.spec.js"
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

# Check for skipped tests in relevant directories
echo -e "\n${YELLOW}=================================${NC}"
echo -e "${YELLOW}Checking for Skipped Tests${NC}"
echo -e "${YELLOW}=================================${NC}"

check_skipped_tests "src/tests/components/travel-planning"
check_skipped_tests "server/tests" "route*.test.js"
check_skipped_tests "src/tests/integration" "travel-planning*.test.js"
if [ -d "tests" ]; then
  check_skipped_tests "tests" "*travel-planning*.spec.js"
fi

# Summary
echo -e "\n${YELLOW}=================================${NC}"
echo -e "${YELLOW}Test Summary${NC}"
echo -e "${YELLOW}=================================${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
  TEST_STATUS="PASSED"
  echo -e "${GREEN}All test groups passed!${NC}"
  exit_code=0
else
  TEST_STATUS="FAILED"
  echo -e "${RED}$FAILED_TESTS test group(s) failed!${NC}"
  exit_code=1
fi

# Create summary file if it doesn't exist
SUMMARY_FILE="${OUTPUT_DIR}/test_summary.md"
if [ ! -f "$SUMMARY_FILE" ]; then
  echo "# Travel Planning Test History" > "$SUMMARY_FILE"
  echo "" >> "$SUMMARY_FILE"
  echo "| Date | Status | Results File |" >> "$SUMMARY_FILE"
  echo "|------|--------|-------------|" >> "$SUMMARY_FILE"
fi

# Add this test run to the summary
if [ "$TEST_STATUS" == "PASSED" ]; then
  STATUS_ICON="✅"
else
  STATUS_ICON="❌"
fi

# Insert new result at the top of the table (after header)
sed -i "4i | $(date '+%Y-%m-%d %H:%M:%S') | ${STATUS_ICON} ${TEST_STATUS} | [Results](./$(basename ${RESULTS_FILE})) |" "$SUMMARY_FILE"

# Create a latest.html that redirects to the most recent report
cat > "${OUTPUT_DIR}/latest.txt" << EOL
This file links to the latest test results.
Latest test run: $(date '+%Y-%m-%d %H:%M:%S')
Status: ${TEST_STATUS}
File: $(basename ${RESULTS_FILE})
EOL

echo -e "${GREEN}Test results saved to: ${RESULTS_FILE}${NC}"
echo -e "${GREEN}Summary updated at: ${SUMMARY_FILE}${NC}"

exit $exit_code 