# Test Script Templates

This directory contains template files for creating new test scripts that follow project best practices.

## Available Templates

- **test-script-template.js** - JavaScript template for Node.js test scripts
- **test-script-template.sh** - Bash shell script template for Unix/Linux tests
- **test-script-template.ps1** - PowerShell template for Windows tests

## Key Principles

### ✅ Always Use Existing Repository Directories

The most important principle is to store test results in existing repository directories instead of creating new runtime directories. Use the following pattern:

```
docs/project_lifecycle/all_tests/results/{test-type}/
```

Where `{test-type}` is the category of test (e.g., `stability-test`, `user-journey`, `load-test`).

### ✅ Create a Summary File

Each test result directory should include a summary file (`test_summary.md`) that tracks test history over time.

### ✅ Create a Latest Test Reference

Include a pointer to the most recent test run using a `latest.txt` or `latest.html` file.

## Using the Templates

1. Copy the appropriate template based on your test language/environment
2. Rename the file to match your test purpose
3. Update the test parameters (TEST_NAME, TEST_TYPE)
4. Replace the example test commands with your actual test logic
5. Run the script to execute tests and generate results

## Example

```bash
# Copy the template 
cp utils/test-script-template.sh run-my-new-tests.sh

# Edit the script to customize it
# Update TEST_NAME and TEST_TYPE
# Add your test commands

# Make it executable
chmod +x run-my-new-tests.sh

# Run the script
./run-my-new-tests.sh
```

All test results will be properly saved to the designated directory with summary tracking. 