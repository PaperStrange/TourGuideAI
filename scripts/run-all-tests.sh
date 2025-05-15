#!/bin/bash
# TourGuideAI All Tests Runner
# This script runs all tests (frontend and backend) and generates a comprehensive report

# Exit on error
set -e

# Define colors
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get script directory and project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo -e "${GREEN}=== TourGuideAI Complete Test Suite ===${NC}"
echo -e "${CYAN}Starting test run at $(date)${NC}"
echo -e "${CYAN}Project root: $PROJECT_ROOT${NC}"

# Set working directory to project root
cd "$PROJECT_ROOT"

# Environment check
echo -e "\n${YELLOW}Checking environment...${NC}"
ENV_CHECKS=true

if [ ! -d "server" ]; then
    echo -e "${RED}Error: Server directory not found.${NC}"
    ENV_CHECKS=false
fi

if [ ! -d "src" ]; then
    echo -e "${RED}Error: src directory not found.${NC}"
    ENV_CHECKS=false
fi

if [ ! -d "tests" ]; then
    echo -e "${RED}Error: tests directory not found.${NC}"
    ENV_CHECKS=false
fi

if [ "$ENV_CHECKS" = false ]; then
    echo -e "${RED}Environment checks failed. Make sure you're running this from the project root.${NC}"
    exit 1
fi

# Initialize test results
FRONTEND_STATUS="Not Run"
FRONTEND_EXIT_CODE=-1
BACKEND_STATUS="Not Run"
BACKEND_EXIT_CODE=-1

# Run backend tests
echo -e "\n${CYAN}=== Running Backend Tests ===${NC}"
run_backend_tests() {
    echo -e "${YELLOW}Running server tests...${NC}"
    
    # Change to server directory
    cd "$PROJECT_ROOT/server"
    
    # Test files to run
    TEST_FILES=(
        "tests/auth.test.js"
        "tests/auth-isolated.test.js"
        "tests/db-connection.test.js"
        "tests/db-schema.test.js"
        "tests/routeGeneration.test.js"
        "tests/routeManagement.test.js"
    )
    
    FAILED_TESTS=()
    PASSED_TESTS=()
    
    for TEST_FILE in "${TEST_FILES[@]}"; do
        echo -e "${CYAN}Running test: $TEST_FILE${NC}"
        if npm test -- "$TEST_FILE"; then
            PASSED_TESTS+=("$TEST_FILE")
            echo -e "${GREEN}✓ Test passed: $TEST_FILE${NC}"
        else
            FAILED_TESTS+=("$TEST_FILE")
            echo -e "${RED}✗ Test failed: $TEST_FILE${NC}"
        fi
    done
    
    # Summary
    echo -e "\n${CYAN}=== Backend Test Summary ===${NC}"
    echo -e "Total tests: ${#TEST_FILES[@]}"
    echo -e "${GREEN}Passed: ${#PASSED_TESTS[@]}${NC}"
    echo -e "${RED}Failed: ${#FAILED_TESTS[@]}${NC}"
    
    if [ ${#FAILED_TESTS[@]} -gt 0 ]; then
        echo -e "\n${RED}Failed tests:${NC}"
        for TEST in "${FAILED_TESTS[@]}"; do
            echo -e "${RED} - $TEST${NC}"
        done
        return 1
    fi
    
    return 0
}

try_backend_tests() {
    if run_backend_tests; then
        BACKEND_STATUS="Passed"
        BACKEND_EXIT_CODE=0
        echo -e "${GREEN}✓ All backend tests passed${NC}"
    else
        BACKEND_STATUS="Failed"
        BACKEND_EXIT_CODE=1
        echo -e "${RED}✗ Some backend tests failed${NC}"
    fi
}

# Run frontend tests
run_frontend_tests() {
    echo -e "\n${CYAN}=== Running Frontend Tests ===${NC}"
    echo -e "${YELLOW}Running frontend tests...${NC}"
    
    # Return to project root
    cd "$PROJECT_ROOT"
    
    # Test categories with their respective directories
    declare -A TEST_CATEGORIES
    TEST_CATEGORIES["API Tests"]="src/tests/api"
    TEST_CATEGORIES["Component Tests"]="src/tests/components"
    TEST_CATEGORIES["Integration Tests"]="src/tests/integration"
    TEST_CATEGORIES["Stability Tests"]="src/tests/stability"
    
    TOTAL_TESTS=0
    PASSED_TESTS=0
    FAILED_TESTS=0
    SKIPPED_TESTS=0
    
    FAILED_TEST_FILES=()
    
    for CATEGORY in "${!TEST_CATEGORIES[@]}"; do
        CATEGORY_DIR="${TEST_CATEGORIES[$CATEGORY]}"
        
        if [ -d "$CATEGORY_DIR" ]; then
            echo -e "\n${CYAN}Running $CATEGORY...${NC}"
            
            # Get all test files in the directory (excluding .skip files)
            TEST_FILES=$(find "$CATEGORY_DIR" -name "*.test.js" ! -name "*.skip.js" -type f)
            
            # Count skipped tests
            SKIPPED_COUNT=$(find "$CATEGORY_DIR" -name "*.test.js.skip" -type f | wc -l)
            SKIPPED_TESTS=$((SKIPPED_TESTS + SKIPPED_COUNT))
            
            if [ -z "$TEST_FILES" ]; then
                echo -e "${YELLOW}  No test files found in $CATEGORY_DIR${NC}"
                continue
            fi
            
            for TEST_FILE in $TEST_FILES; do
                TOTAL_TESTS=$((TOTAL_TESTS + 1))
                echo -e "${CYAN}  Running test: $TEST_FILE${NC}"
                
                # Run test with Jest
                CI=true npm test -- "$TEST_FILE" --no-watch
                
                if [ $? -eq 0 ]; then
                    PASSED_TESTS=$((PASSED_TESTS + 1))
                    echo -e "${GREEN}  ✓ Test passed: $TEST_FILE${NC}"
                else
                    FAILED_TESTS=$((FAILED_TESTS + 1))
                    FAILED_TEST_FILES+=("$TEST_FILE")
                    echo -e "${RED}  ✗ Test failed: $TEST_FILE${NC}"
                fi
            done
        else
            echo -e "${YELLOW}  Directory not found: $CATEGORY_DIR${NC}"
        fi
    done
    
    # Summary
    echo -e "\n${CYAN}=== Frontend Test Summary ===${NC}"
    echo -e "Total tests: $TOTAL_TESTS"
    echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
    echo -e "${RED}Failed: $FAILED_TESTS${NC}"
    echo -e "${YELLOW}Skipped: $SKIPPED_TESTS${NC}"
    
    if [ $FAILED_TESTS -gt 0 ]; then
        echo -e "\n${RED}Failed tests:${NC}"
        for TEST in "${FAILED_TEST_FILES[@]}"; do
            echo -e "${RED} - $TEST${NC}"
        done
        return 1
    fi
    
    return 0
}

try_frontend_tests() {
    if run_frontend_tests; then
        FRONTEND_STATUS="Passed"
        FRONTEND_EXIT_CODE=0
        echo -e "${GREEN}✓ All frontend tests passed${NC}"
    else
        FRONTEND_STATUS="Failed"
        FRONTEND_EXIT_CODE=1
        echo -e "${RED}✗ Some frontend tests failed${NC}"
    fi
}

# Run the tests and catch errors
(try_backend_tests) || true
(try_frontend_tests) || true

# Return to project root
cd "$PROJECT_ROOT"

# Generate report
echo -e "\n${CYAN}=== Test Results Summary ===${NC}"
if [ "$FRONTEND_STATUS" = "Passed" ]; then
    echo -e "${GREEN}Frontend tests: $FRONTEND_STATUS${NC}"
else
    echo -e "${RED}Frontend tests: $FRONTEND_STATUS${NC}"
fi

if [ "$BACKEND_STATUS" = "Passed" ]; then
    echo -e "${GREEN}Backend tests: $BACKEND_STATUS${NC}"
else
    echo -e "${RED}Backend tests: $BACKEND_STATUS${NC}"
fi

# Generate test report file
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
REPORT_DIR="$PROJECT_ROOT/test-results"
REPORT_PATH="$REPORT_DIR/test-report-$TIMESTAMP.txt"

# Create directory if it doesn't exist
mkdir -p "$REPORT_DIR"

# Write report
cat > "$REPORT_PATH" << EOL
TourGuideAI Test Report
=======================
Generated: $(date)

Overall Status: $(if [ "$FRONTEND_STATUS" = "Passed" ] && [ "$BACKEND_STATUS" = "Passed" ]; then echo "PASS"; else echo "FAIL"; fi)

Frontend Tests: $FRONTEND_STATUS
Backend Tests: $BACKEND_STATUS

For detailed test results, refer to the console output or individual test log files.
EOL

echo -e "\n${YELLOW}Test report saved to: $REPORT_PATH${NC}"

# Set final exit code
EXIT_CODE=0
if [ $FRONTEND_EXIT_CODE -ne 0 ] || [ $BACKEND_EXIT_CODE -ne 0 ]; then
    EXIT_CODE=1
fi

echo -e "\n${CYAN}Test run completed at $(date)${NC}"
if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}Exit code: $EXIT_CODE${NC}"
else
    echo -e "${RED}Exit code: $EXIT_CODE${NC}"
fi

exit $EXIT_CODE 