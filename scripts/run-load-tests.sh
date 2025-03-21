#!/bin/bash

# Script to run load tests for TourGuideAI
# Requires k6 to be installed: https://k6.io/docs/get-started/installation/

# Set environment variables
export BASE_URL=${1:-"https://staging.tourguideai.com"}
export OUTPUT_DIR="./load-test-results"
export TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
export TEST_NAME="load_test_${TIMESTAMP}"

# Create output directory
mkdir -p $OUTPUT_DIR

echo "Running load tests against $BASE_URL"
echo "Results will be saved to $OUTPUT_DIR/$TEST_NAME"

# Run the load test
k6 run \
  --out json=$OUTPUT_DIR/${TEST_NAME}_raw.json \
  --out csv=$OUTPUT_DIR/${TEST_NAME}_metrics.csv \
  --summary-export=$OUTPUT_DIR/${TEST_NAME}_summary.json \
  tests/load-test.js

# Generate HTML report from JSON results
echo "Generating HTML report"
cat > $OUTPUT_DIR/${TEST_NAME}_report.html << EOL
<!DOCTYPE html>
<html>
<head>
  <title>TourGuideAI Load Test Report</title>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/papaparse@5.3.0/papaparse.min.js"></script>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .container { max-width: 1200px; margin: 0 auto; }
    .header { background-color: #3498db; color: white; padding: 20px; border-radius: 5px; }
    .metrics { display: flex; flex-wrap: wrap; justify-content: space-between; margin: 20px 0; }
    .metric-card { border: 1px solid #ddd; border-radius: 5px; padding: 15px; margin-bottom: 15px; width: 22%; }
    .metric-card h3 { margin-top: 0; color: #3498db; }
    .chart-container { margin: 20px 0; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
    .threshold { margin: 20px 0; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
    .threshold-pass { color: green; }
    .threshold-fail { color: red; }
    @media (max-width: 768px) {
      .metric-card { width: 45%; }
    }
    @media (max-width: 480px) {
      .metric-card { width: 100%; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>TourGuideAI Load Test Report</h1>
      <p>Test run: ${TIMESTAMP}</p>
      <p>Target URL: ${BASE_URL}</p>
    </div>
    
    <div class="metrics" id="metrics-container">
      <!-- Metrics will be populated by JavaScript -->
    </div>
    
    <div class="chart-container">
      <h2>Response Time Trends</h2>
      <canvas id="responseTimeChart"></canvas>
    </div>
    
    <div class="chart-container">
      <h2>Request Rate</h2>
      <canvas id="requestRateChart"></canvas>
    </div>
    
    <div class="threshold" id="thresholds">
      <h2>Thresholds</h2>
      <!-- Thresholds will be populated by JavaScript -->
    </div>
  </div>
  
  <script>
    // Load the test summary
    fetch('${TEST_NAME}_summary.json')
      .then(response => response.json())
      .then(data => {
        populateMetrics(data);
        checkThresholds(data);
      });
    
    // Load CSV data and create charts
    Papa.parse('${TEST_NAME}_metrics.csv', {
      download: true,
      header: true,
      complete: function(results) {
        createCharts(results.data);
      }
    });
    
    function populateMetrics(data) {
      const metricsContainer = document.getElementById('metrics-container');
      const metrics = [
        { name: 'VUs', value: data.metrics.vus.max },
        { name: 'Duration', value: formatDuration(data.metrics.iteration_duration.max) },
        { name: 'Iterations', value: data.metrics.iterations.count },
        { name: 'Failed Requests', value: data.metrics.http_req_failed.fails },
      ];
      
      metrics.forEach(metric => {
        const card = document.createElement('div');
        card.className = 'metric-card';
        card.innerHTML = \`<h3>\${metric.name}</h3><p>\${metric.value}</p>\`;
        metricsContainer.appendChild(card);
      });
    }
    
    function checkThresholds(data) {
      const thresholdsContainer = document.getElementById('thresholds');
      const thresholds = data.metrics;
      
      Object.keys(thresholds).forEach(key => {
        if (thresholds[key].thresholds && thresholds[key].thresholds.length > 0) {
          thresholds[key].thresholds.forEach(threshold => {
            const div = document.createElement('div');
            div.className = threshold.ok ? 'threshold-pass' : 'threshold-fail';
            div.innerHTML = \`<strong>\${key}:</strong> \${threshold.name} - \${threshold.ok ? 'PASSED' : 'FAILED'}\`;
            thresholdsContainer.appendChild(div);
          });
        }
      });
    }
    
    function createCharts(data) {
      // Filter and prepare data
      const timestamps = data.map(row => new Date(row.timestamp));
      const responseTimesData = data.filter(row => row.metric === 'http_req_duration').map(row => ({
        x: new Date(row.timestamp),
        y: parseFloat(row.value) / 1000 // Convert to seconds
      }));
      
      const routeGenerationData = data.filter(row => row.metric === 'route_generation_time').map(row => ({
        x: new Date(row.timestamp),
        y: parseFloat(row.value) / 1000
      }));
      
      const requestRateData = data.filter(row => row.metric === 'http_reqs').map(row => ({
        x: new Date(row.timestamp),
        y: parseFloat(row.value)
      }));
      
      // Response Time Chart
      const responseTimeCtx = document.getElementById('responseTimeChart').getContext('2d');
      new Chart(responseTimeCtx, {
        type: 'line',
        data: {
          datasets: [
            {
              label: 'HTTP Response Time (s)',
              data: responseTimesData,
              borderColor: '#3498db',
              backgroundColor: 'rgba(52, 152, 219, 0.1)',
              tension: 0.4
            },
            {
              label: 'Route Generation Time (s)',
              data: routeGenerationData,
              borderColor: '#e74c3c',
              backgroundColor: 'rgba(231, 76, 60, 0.1)',
              tension: 0.4
            }
          ]
        },
        options: {
          responsive: true,
          scales: {
            x: {
              type: 'time',
              time: {
                unit: 'minute'
              }
            },
            y: {
              title: {
                display: true,
                text: 'Time (seconds)'
              }
            }
          }
        }
      });
      
      // Request Rate Chart
      const requestRateCtx = document.getElementById('requestRateChart').getContext('2d');
      new Chart(requestRateCtx, {
        type: 'line',
        data: {
          datasets: [{
            label: 'Requests per Second',
            data: requestRateData,
            borderColor: '#2ecc71',
            backgroundColor: 'rgba(46, 204, 113, 0.1)',
            tension: 0.4
          }]
        },
        options: {
          responsive: true,
          scales: {
            x: {
              type: 'time',
              time: {
                unit: 'minute'
              }
            },
            y: {
              title: {
                display: true,
                text: 'Requests/sec'
              }
            }
          }
        }
      });
    }
    
    function formatDuration(ms) {
      const seconds = Math.floor(ms / 1000);
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return \`\${minutes}m \${remainingSeconds}s\`;
    }
  </script>
</body>
</html>
EOL

echo "Load test completed. Results available at $OUTPUT_DIR/${TEST_NAME}_report.html" 