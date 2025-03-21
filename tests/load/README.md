# Load Testing Suite

This directory contains the configuration and scenario files for load testing the TourGuideAI application using k6.

## Overview

The load testing suite uses k6 to simulate different user loads and traffic patterns on the application. It helps ensure the application can handle expected traffic volumes and identifies performance bottlenecks under load.

## Directory Structure

- `k6.config.js` - Main configuration file for k6 load testing
- `scenarios/` - Test scenarios for different application flows
  - `route_creation.js` - Load test for the route creation flow
  - `home.js` - Load test for the home page
  - `auth.js` - Load test for the authentication flow
  - `route_viewing.js` - Load test for the route viewing flow
  - `api_only/` - API-focused load test scenarios
    - `route_generation.js` - Tests for the route generation API
    - `route_fetching.js` - Tests for the route fetching API
    - `user_profile.js` - Tests for the user profile API

## Load Testing Scenarios

The configuration defines four main load testing scenarios:

1. **Normal Load** - Simulates typical daily usage with gradual ramp-up to 20 users
2. **Peak Load** - Simulates peak usage with up to 50 concurrent users
3. **API Stress** - Targets API endpoints directly with 30 requests per second
4. **Soak Test** - Tests long-term reliability with 10 users over 30 minutes

## Running Tests

### Prerequisites

1. Install k6:
   ```bash
   # Linux
   sudo apt-get install k6
   
   # macOS
   brew install k6
   
   # Windows
   choco install k6
   ```

### Running a Test

Run all scenarios:
```bash
k6 run tests/load/k6.config.js
```

Run a specific scenario:
```bash
k6 run --env SCENARIO=normal_load tests/load/k6.config.js
```

Run with custom environment variables:
```bash
k6 run --env BASE_URL=https://staging.tourguideai.com tests/load/k6.config.js
```

### Test Results

Test results can be output in various formats:

```bash
# JSON output
k6 run --out json=results.json tests/load/k6.config.js

# CSV output
k6 run --out csv=results.csv tests/load/k6.config.js

# InfluxDB output (for visualization in Grafana)
k6 run --out influxdb=http://localhost:8086/k6 tests/load/k6.config.js
```

## Performance Thresholds

The tests include the following thresholds:

- 95% of requests must complete below 1 second
- 99% of requests must complete below 2 seconds
- Less than 1% of requests should fail
- Static assets should load in under 100ms for 95% of requests
- API calls should complete in under 1 second for 95% of requests

## Adding New Scenarios

To add a new test scenario:

1. Create a new JavaScript file in the `scenarios/` directory
2. Export a function that performs the test steps
3. Import and call the function from `k6.config.js`

## Load Testing Results

A full report of load testing results is available in `docs/phase5-implementation-status.md`. 