#!/bin/bash

# Test Script Template
# This template follows project best practices for test execution and reporting
# Use this as a starting point for creating new test scripts

# Set colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Define test parameters - Change these to match your test
TEST_NAME="example-test"
TEST_TYPE="example"

# Always use an existing repository directory for output
# Following the pattern: docs/project_lifecycle/all_tests/results/{test-type}
OUTPUT_DIR="./docs/project_lifecycle/all_tests/results/${TEST_TYPE}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
RESULTS_FILE="${OUTPUT_DIR}/${TEST_NAME}-results-${TIMESTAMP}.txt"
SUMMARY_FILE="${OUTPUT_DIR}/test_summary.md"

# Create output directory if it doesn't exist
mkdir -p "${OUTPUT_DIR}"

# Start capturing output
exec > >(tee -a "${RESULTS_FILE}") 2>&1

# Print header
echo -e "${YELLOW}=================================${NC}"
echo -e "${YELLOW}${TEST_NAME} Test Runner${NC}"
echo -e "${YELLOW}=================================${NC}"
echo "Test run started at: $(date)"
echo "Results being saved to: ${RESULTS_FILE}"

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

# Example test groups - Replace with your actual tests
run_test_group "Example Test Group 1" "echo 'This is a simulated test' && exit 0"
FAILED_TESTS=$((FAILED_TESTS + $?))

run_test_group "Example Test Group 2" "echo 'This is another simulated test' && exit 0"
FAILED_TESTS=$((FAILED_TESTS + $?))

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
if [ ! -f "$SUMMARY_FILE" ]; then
  echo "# ${TEST_NAME^} Test History" > "$SUMMARY_FILE"
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

# Create a latest.txt that points to the most recent test run
cat > "${OUTPUT_DIR}/latest.txt" << EOL
This file links to the latest test results.
Latest test run: $(date '+%Y-%m-%d %H:%M:%S')
Status: ${TEST_STATUS}
File: $(basename ${RESULTS_FILE})
EOL

echo -e "${GREEN}Test results saved to: ${RESULTS_FILE}${NC}"
echo -e "${GREEN}Summary updated at: ${SUMMARY_FILE}${NC}"

exit $exit_code 