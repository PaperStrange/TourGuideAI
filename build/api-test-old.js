/**
 * TourGuideAI - Enhanced API Test Console
 * 
 * This script provides a robust testing environment for the TourGuideAI application APIs,
 * including OpenAI and Google Maps integrations.
 */

// Create a test console with fixed position and styling
document.addEventListener('DOMContentLoaded', () => {
  // Clean up any existing console
  const existingConsole = document.getElementById('api-test-console');
  if (existingConsole) {
    existingConsole.remove();
  }

  // Create a new test console
  const testConsole = document.createElement('div');
  testConsole.id = 'api-test-console';
  testConsole.style.cssText = `
    position: fixed;
    top: 50px;
    right: 20px;
    width: 800px;
    max-width: 80vw;
    height: 80vh;
    background-color: #1e1e1e;
    color: #f0f0f0;
    border-radius: 8px;
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.5);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    z-index: 1000;
    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  `;

  // Add a header for the test console
  const header = document.createElement('div');
  header.style.cssText = `
    padding: 10px 15px;
    background-color: #2c2c2c;
    border-bottom: 1px solid #3e3e3e;
    display: flex;
    justify-content: space-between;
    align-items: center;
  `;
  
  const title = document.createElement('div');
  title.textContent = 'TourGuideAI API Test Console';
  title.style.cssText = `
    font-weight: bold;
    font-size: 16px;
  `;
  
  const closeButton = document.createElement('button');
  closeButton.textContent = '×';
  closeButton.style.cssText = `
    background: none;
    border: none;
    color: #f0f0f0;
    font-size: 24px;
    cursor: pointer;
  `;
  closeButton.onclick = () => {
    testConsole.remove();
  };
  
  header.appendChild(title);
  header.appendChild(closeButton);
  testConsole.appendChild(header);

  // Add a configuration section for API keys and settings
  const configSection = document.createElement('div');
  configSection.style.cssText = `
    padding: 10px 15px;
    background-color: #252525;
    border-bottom: 1px solid #3e3e3e;
  `;
  
  // API Configuration UI
  const configTitle = document.createElement('h3');
  configTitle.textContent = 'API Configuration';
  configTitle.style.cssText = 'margin: 0 0 10px 0; font-size: 14px;';
  
  const configForm = document.createElement('div');
  configForm.style.cssText = 'display: flex; flex-wrap: wrap; gap: 10px;';

  // OpenAI Configuration
  const openaiSection = document.createElement('div');
  openaiSection.style.cssText = 'flex: 1; min-width: 300px;';
  
  const openaiTitle = document.createElement('div');
  openaiTitle.textContent = 'OpenAI API';
  openaiTitle.style.cssText = 'font-weight: bold; margin-bottom: 5px;';
  
  const openaiKeyInput = document.createElement('input');
  openaiKeyInput.type = 'password';
  openaiKeyInput.placeholder = 'OpenAI API Key';
  openaiKeyInput.style.cssText = `
    width: 100%;
    padding: 5px;
    margin-bottom: 5px;
    border-radius: 4px;
    border: 1px solid #3e3e3e;
    background-color: #333;
    color: #f0f0f0;
  `;
  
  const openaiModeToggle = document.createElement('button');
  openaiModeToggle.textContent = 'Using Simulation';
  openaiModeToggle.style.cssText = `
    padding: 5px 10px;
    border-radius: 4px;
    border: none;
    background-color: #444;
    color: #f0f0f0;
    cursor: pointer;
    margin-right: 5px;
  `;
  
  const openaiKeySet = document.createElement('button');
  openaiKeySet.textContent = 'Set OpenAI Key';
  openaiKeySet.style.cssText = `
    padding: 5px 10px;
    border-radius: 4px;
    border: none;
    background-color: #007bff;
    color: #f0f0f0;
    cursor: pointer;
  `;
  
  openaiSection.appendChild(openaiTitle);
  openaiSection.appendChild(openaiKeyInput);
  openaiSection.appendChild(openaiModeToggle);
  openaiSection.appendChild(openaiKeySet);
  
  // Google Maps Configuration
  const googleSection = document.createElement('div');
  googleSection.style.cssText = 'flex: 1; min-width: 300px;';
  
  const googleTitle = document.createElement('div');
  googleTitle.textContent = 'Google Maps API';
  googleTitle.style.cssText = 'font-weight: bold; margin-bottom: 5px;';
  
  const googleKeyInput = document.createElement('input');
  googleKeyInput.type = 'password';
  googleKeyInput.placeholder = 'Google Maps API Key';
  googleKeyInput.style.cssText = `
    width: 100%;
    padding: 5px;
    margin-bottom: 5px;
    border-radius: 4px;
    border: 1px solid #3e3e3e;
    background-color: #333;
    color: #f0f0f0;
  `;
  
  const googleModeToggle = document.createElement('button');
  googleModeToggle.textContent = 'Using Simulation';
  googleModeToggle.style.cssText = `
    padding: 5px 10px;
    border-radius: 4px;
    border: none;
    background-color: #444;
    color: #f0f0f0;
    cursor: pointer;
    margin-right: 5px;
  `;
  
  const googleKeySet = document.createElement('button');
  googleKeySet.textContent = 'Set Google Key';
  googleKeySet.style.cssText = `
    padding: 5px 10px;
    border-radius: 4px;
    border: none;
    background-color: #007bff;
    color: #f0f0f0;
    cursor: pointer;
  `;
  
  googleSection.appendChild(googleTitle);
  googleSection.appendChild(googleKeyInput);
  googleSection.appendChild(googleModeToggle);
  googleSection.appendChild(googleKeySet);
  
  configForm.appendChild(openaiSection);
  configForm.appendChild(googleSection);
  
  // Debug toggle and status display
  const debugSection = document.createElement('div');
  debugSection.style.cssText = 'display: flex; justify-content: space-between; margin-top: 10px;';
  
  const debugToggle = document.createElement('button');
  debugToggle.textContent = 'Enable Debug';
  debugToggle.style.cssText = `
    padding: 5px 10px;
    border-radius: 4px;
    border: none;
    background-color: #444;
    color: #f0f0f0;
    cursor: pointer;
  `;
  
  const statusDisplay = document.createElement('div');
  statusDisplay.id = 'api-status';
  statusDisplay.style.cssText = `
    font-size: 12px;
    color: #aaa;
  `;
  statusDisplay.textContent = 'Status: Not connected';
  
  debugSection.appendChild(debugToggle);
  debugSection.appendChild(statusDisplay);
  
  configSection.appendChild(configTitle);
  configSection.appendChild(configForm);
  configSection.appendChild(debugSection);
  testConsole.appendChild(configSection);

  // Add a content section for test output
  const contentWrap = document.createElement('div');
  contentWrap.style.cssText = `
    flex: 1;
    overflow-y: auto;
    padding: 10px;
  `;
  
  const content = document.createElement('div');
  content.id = 'api-test-content';
  content.style.cssText = `
    line-height: 1.5;
    white-space: pre-wrap;
  `;
  
  contentWrap.appendChild(content);
  testConsole.appendChild(contentWrap);

  // Add a test input section
  const testInputSection = document.createElement('div');
  testInputSection.style.cssText = `
    padding: 10px;
    background-color: #252525;
    border-top: 1px solid #3e3e3e;
  `;
  
  const testInputTitle = document.createElement('div');
  testInputTitle.textContent = 'Test a Route Query:';
  testInputTitle.style.cssText = 'margin-bottom: 5px; font-size: 14px;';
  
  const inputRow = document.createElement('div');
  inputRow.style.cssText = 'display: flex; gap: 5px;';
  
  const testInput = document.createElement('input');
  testInput.type = 'text';
  testInput.placeholder = 'Enter a travel query (e.g., "Show me a 3-day tour of Rome")';
  testInput.style.cssText = `
    flex: 1;
    padding: 8px;
    border-radius: 4px;
    border: 1px solid #3e3e3e;
    background-color: #333;
    color: #f0f0f0;
  `;
  
  const testButton = document.createElement('button');
  testButton.textContent = 'Test';
  testButton.style.cssText = `
    padding: 8px 15px;
    border-radius: 4px;
    border: none;
    background-color: #28a745;
    color: #f0f0f0;
    cursor: pointer;
  `;
  
  const runAllButton = document.createElement('button');
  runAllButton.textContent = 'Run All Tests';
  runAllButton.style.cssText = `
    padding: 8px 15px;
    border-radius: 4px;
    border: none;
    background-color: #007bff;
    color: #f0f0f0;
    cursor: pointer;
    margin-left: 5px;
  `;
  
  inputRow.appendChild(testInput);
  inputRow.appendChild(testButton);
  inputRow.appendChild(runAllButton);
  
  testInputSection.appendChild(testInputTitle);
  testInputSection.appendChild(inputRow);
  testConsole.appendChild(testInputSection);

  document.body.appendChild(testConsole);

  // Get references
  const outputElement = document.getElementById('api-test-content');
  const statusElement = document.getElementById('api-status');

  // Initialize API modules
  let openaiApi, googleMapsApi;

  try {
    // Load the modules dynamically
    log('Loading API modules...', 'pending');
    
    // Try to import the modules from src/api
    Promise.all([
      import('/src/api/openaiApi.js').catch(error => {
        log(`OpenAI API module load failed: ${error.message}`, 'error');
        return import('/build/api.js').catch(e => null);
      }),
      import('/src/api/googleMapsApi.js').catch(error => {
        log(`Google Maps API module load failed: ${error.message}`, 'error');
        return null;
      })
    ]).then(([openaiModule, googleMapsModule]) => {
      // Extracting the modules
      openaiApi = openaiModule?.default || openaiModule;
      googleMapsApi = googleMapsModule?.default || googleMapsModule;
      
      if (openaiApi) {
        log('OpenAI API module loaded successfully', 'success');
      } else {
        log('Failed to load any OpenAI API module', 'error');
      }
      
      if (googleMapsApi) {
        log('Google Maps API module loaded successfully', 'success');
      } else {
        log('Failed to load Google Maps API module', 'error');
      }
      
      updateStatus();
    }).catch(error => {
      log(`Error loading API modules: ${error.message}`, 'error');
    });
  } catch (error) {
    log(`Error initializing API modules: ${error.message}`, 'error');
  }

  // Debug mode state
  let debugMode = false;

  // API configuration state
  const apiConfig = {
    openai: {
      usingReal: false,
      key: '',
      isConfigured: false
    },
    google: {
      usingReal: false,
      key: '',
      isConfigured: false
    }
  };

  // Update the status display
  function updateStatus() {
    if (!statusElement) return;
    
    const openaiStatus = openaiApi ? 
      (apiConfig.openai.isConfigured ? 
        (apiConfig.openai.usingReal ? 'Real API' : 'Simulation') : 
        'Not Configured') : 
      'Not Loaded';
      
    const googleStatus = googleMapsApi ? 
      (apiConfig.google.isConfigured ? 
        (apiConfig.google.usingReal ? 'Real API' : 'Simulation') : 
        'Not Configured') : 
      'Not Loaded';
    
    statusElement.textContent = `Status: OpenAI: ${openaiStatus} | Google Maps: ${googleStatus} | Debug: ${debugMode ? 'ON' : 'OFF'}`;
  }

  // Event listeners for API configuration
  openaiModeToggle.addEventListener('click', () => {
    apiConfig.openai.usingReal = !apiConfig.openai.usingReal;
    openaiModeToggle.textContent = apiConfig.openai.usingReal ? 'Using Real API' : 'Using Simulation';
    openaiModeToggle.style.backgroundColor = apiConfig.openai.usingReal ? '#28a745' : '#444';
    
    if (openaiApi) {
      // Call the API setMode function if it exists
      if (typeof openaiApi.setMode === 'function') {
        openaiApi.setMode(apiConfig.openai.usingReal ? 'real' : 'simulation');
      }
    }
    
    updateStatus();
    log(`OpenAI API mode set to: ${apiConfig.openai.usingReal ? 'Real API' : 'Simulation'}`, 'info');
  });

  googleModeToggle.addEventListener('click', () => {
    apiConfig.google.usingReal = !apiConfig.google.usingReal;
    googleModeToggle.textContent = apiConfig.google.usingReal ? 'Using Real API' : 'Using Simulation';
    googleModeToggle.style.backgroundColor = apiConfig.google.usingReal ? '#28a745' : '#444';
    
    updateStatus();
    log(`Google Maps API mode set to: ${apiConfig.google.usingReal ? 'Real API' : 'Simulation'}`, 'info');
  });

  openaiKeySet.addEventListener('click', () => {
    const key = openaiKeyInput.value.trim();
    if (!key) {
      log('Please enter an OpenAI API key', 'error');
      return;
    }
    
    try {
      if (openaiApi && typeof openaiApi.setApiKey === 'function') {
        openaiApi.setApiKey(key);
        apiConfig.openai.key = key;
        apiConfig.openai.isConfigured = true;
        log('OpenAI API key configured successfully', 'success');
      } else {
        log('OpenAI API module not loaded or setApiKey function not available', 'error');
      }
    } catch (error) {
      log(`Failed to set OpenAI API key: ${error.message}`, 'error');
    }
    
    updateStatus();
  });

  googleKeySet.addEventListener('click', () => {
    const key = googleKeyInput.value.trim();
    if (!key) {
      log('Please enter a Google Maps API key', 'error');
      return;
    }
    
    try {
      if (googleMapsApi && typeof googleMapsApi.setApiKey === 'function') {
        googleMapsApi.setApiKey(key);
        apiConfig.google.key = key;
        apiConfig.google.isConfigured = true;
        log('Google Maps API key configured successfully', 'success');
      } else {
        log('Google Maps API module not loaded or setApiKey function not available', 'error');
      }
    } catch (error) {
      log(`Failed to set Google Maps API key: ${error.message}`, 'error');
    }
    
    updateStatus();
  });

  debugToggle.addEventListener('click', () => {
    debugMode = !debugMode;
    debugToggle.textContent = debugMode ? 'Disable Debug' : 'Enable Debug';
    debugToggle.style.backgroundColor = debugMode ? '#28a745' : '#444';
    
    // Set debug mode in APIs if available
    if (openaiApi && typeof openaiApi.setDebugMode === 'function') {
      openaiApi.setDebugMode(debugMode);
    }
    
    if (googleMapsApi && typeof googleMapsApi.setDebugMode === 'function') {
      googleMapsApi.setDebugMode(debugMode);
    }
    
    updateStatus();
    log(`Debug mode ${debugMode ? 'enabled' : 'disabled'}`, 'info');
    
    // Display API status details in debug mode
    if (debugMode) {
      const openaiStatus = openaiApi && typeof openaiApi.getStatus === 'function' ? 
        openaiApi.getStatus() : 'Status not available';
      
      const googleStatus = googleMapsApi && typeof googleMapsApi.getStatus === 'function' ? 
        googleMapsApi.getStatus() : 'Status not available';
      
      logDebug('OpenAI API Status:', openaiStatus);
      logDebug('Google Maps API Status:', googleStatus);
    }
  });

  // Logging functions
  function log(message, type = 'info') {
    if (!outputElement) return;
    
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = document.createElement('div');
    
    switch (type) {
      case 'success':
        logEntry.style.color = '#28a745';
        logEntry.textContent = `[${timestamp}] ✓ ${message}`;
        break;
      case 'error':
        logEntry.style.color = '#dc3545';
        logEntry.textContent = `[${timestamp}] ✗ ${message}`;
        break;
      case 'warning':
        logEntry.style.color = '#ffc107';
        logEntry.textContent = `[${timestamp}] ⚠ ${message}`;
        break;
      case 'pending':
        logEntry.style.color = '#17a2b8';
        logEntry.textContent = `[${timestamp}] ⏳ ${message}`;
        break;
      case 'debug':
        if (!debugMode) return;
        logEntry.style.color = '#6c757d';
        logEntry.textContent = `[${timestamp}] 🔍 ${message}`;
        break;
      default:
        logEntry.style.color = '#f0f0f0';
        logEntry.textContent = `[${timestamp}] ${message}`;
    }
    
    outputElement.appendChild(logEntry);
    contentWrap.scrollTop = contentWrap.scrollHeight;
  }

  function logJSON(title, data) {
    if (!outputElement) return;
    
    const logGroup = document.createElement('div');
    logGroup.style.marginBottom = '10px';
    
    const logTitle = document.createElement('div');
    logTitle.textContent = title;
    logTitle.style.fontWeight = 'bold';
    logTitle.style.color = '#17a2b8';
    
    const logContent = document.createElement('pre');
    logContent.style.cssText = `
      background-color: #2d2d2d;
      padding: 8px;
      border-radius: 4px;
      max-height: 300px;
      overflow: auto;
      font-size: 12px;
      margin-top: 5px;
    `;
    
    try {
      const formatted = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
      logContent.textContent = formatted;
    } catch (error) {
      logContent.textContent = `Failed to stringify: ${error.message}`;
    }
    
    logGroup.appendChild(logTitle);
    logGroup.appendChild(logContent);
    outputElement.appendChild(logGroup);
    contentWrap.scrollTop = contentWrap.scrollHeight;
  }

  function logPrompt(title, prompt) {
    logJSON(`${title} (Prompt)`, prompt);
  }

  function logDebug(message, data) {
    if (!debugMode) return;
    
    log(message, 'debug');
    if (data !== undefined) {
      logJSON('[Debug Data]', data);
    }
  }

  // Test runner
  const testRunner = {
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    openaiCalls: 0,
    googleCalls: 0,
    
    async runTest(testName, testFn) {
      this.totalTests++;
      log(`Running test: ${testName}`, 'pending');
      
      try {
        await testFn();
        this.passedTests++;
        log(`Test passed: ${testName}`, 'success');
      } catch (error) {
        this.failedTests++;
        log(`Test failed: ${testName}`, 'error');
        log(error.message, 'error');
        logDebug('Error details:', error);
      }
    },
    
    async runSingleTest(queryText) {
      if (!openaiApi) {
        log('OpenAI API module not loaded. Cannot run test.', 'error');
        return;
      }
      
      log(`Testing query: "${queryText}"`, 'info');
      
      try {
        // Track API calls
        this.openaiCalls++;
        
        // First recognize the intent of the query
        log('Recognizing text intent...', 'pending');
        const intent = await openaiApi.recognizeTextIntent(queryText);
        log('Intent recognition completed', 'success');
        logJSON('Recognized Intent', intent);
        
        // Generate a route based on the intent
        log('Generating route...', 'pending');
        const route = await openaiApi.generateRoute(queryText, intent);
        log('Route generation completed', 'success');
        logJSON('Generated Route', route);
        
        // Test displays
        if (googleMapsApi && route && apiConfig.google.isConfigured) {
          log('Testing map integration...', 'pending');
          this.googleCalls++;
          
          try {
            // Create a temporary map container
            const mapContainer = document.createElement('div');
            mapContainer.style.cssText = `
              width: 500px;
              height: 300px;
              margin: 10px 0;
              border-radius: 4px;
              overflow: hidden;
            `;
            
            // Add the map container to the console
            outputElement.appendChild(mapContainer);
            
            if (apiConfig.google.usingReal) {
              try {
                // Initialize the map
                await googleMapsApi.initializeMap(mapContainer, {
                  zoom: 12,
                  center: { lat: 41.9028, lng: 12.4964 } // Default to Rome
                });
                
                log('Map initialized successfully', 'success');
                
                // Test route display if we have valid route data
                if (route.departure_site && route.arrival_site) {
                  const displayResult = await googleMapsApi.displayRouteOnMap({
                    origin: route.departure_site,
                    destination: route.arrival_site,
                    waypoints: route.sites_included_in_routes || []
                  });
                  
                  log('Route displayed on map', 'success');
                  logJSON('Route Display Result', displayResult);
                } else {
                  log('Route display skipped - missing departure/arrival', 'warning');
                }
              } catch (mapError) {
                log(`Map error: ${mapError.message}`, 'error');
                logDebug('Map error details:', mapError);
              }
            } else {
              // For simulation mode, just show a placeholder
              mapContainer.style.backgroundColor = '#333';
              mapContainer.style.display = 'flex';
              mapContainer.style.justifyContent = 'center';
              mapContainer.style.alignItems = 'center';
              mapContainer.textContent = 'Map Simulation (Real API disabled)';
              
              log('Map display simulated', 'warning');
            }
          } catch (mapError) {
            log(`Map integration error: ${mapError.message}`, 'error');
          }
        }
        
        return route;
      } catch (error) {
        log(`Test failed: ${error.message}`, 'error');
        throw error;
      }
    },
    
    logSummary() {
      const summary = `
Test Summary:
- Total Tests: ${this.totalTests}
- Passed Tests: ${this.passedTests}
- Failed Tests: ${this.failedTests}
- OpenAI API Calls: ${this.openaiCalls}
- Google Maps API Calls: ${this.googleCalls}
      `;
      logJSON('Test Summary', summary);
    },
    
    reset() {
      this.totalTests = 0;
      this.passedTests = 0;
      this.failedTests = 0;
      this.openaiCalls = 0;
      this.googleCalls = 0;
      
      if (outputElement) {
        outputElement.innerHTML = '';
      }
      
      log('Test runner reset', 'info');
    }
  };

  // Test button click handler
  testButton.addEventListener('click', async () => {
    const query = testInput.value.trim();
    if (!query) {
      log('Please enter a query to test', 'error');
      return;
    }
    
    testRunner.reset();
    await testRunner.runSingleTest(query);
    testRunner.logSummary();
  });

  // Run all tests button click handler
  runAllButton.addEventListener('click', async () => {
    testRunner.reset();
    
    log('Running all API tests...', 'info');
    
    // Test 1: Route generation with standard info
    await testRunner.runTest('Route Generation - Standard', async () => {
      const query = "Show me a 3-day tour of Rome with historical sites";
      const result = await testRunner.runSingleTest(query);
      if (!result || !result.sites_included_in_routes || result.sites_included_in_routes.length === 0) {
        throw new Error('Route generation did not include any sites');
      }
    });
    
    // Test 2: Route generation with minimal info
    await testRunner.runTest('Route Generation - Minimal Input', async () => {
      const query = "Paris";
      const result = await testRunner.runSingleTest(query);
      if (!result || !result.departure_site || !result.arrival_site) {
        throw new Error('Route generation did not produce valid departure/arrival sites');
      }
    });
    
    // Test 3: Random route generation
    await testRunner.runTest('Random Route Generation', async () => {
      log('Generating random route...', 'pending');
      testRunner.openaiCalls++;
      const result = await openaiApi.generateRandomRoute();
      log('Random route generation completed', 'success');
      logJSON('Random Route', result);
      
      if (!result || !result.destination || !result.route_type) {
        throw new Error('Random route generation did not produce valid destination/route type');
      }
    });
    
    // Test 4: Timeline generation
    await testRunner.runTest('Timeline Generation', async () => {
      const query = "Show me a 2-day tour of New York";
      const result = await testRunner.runSingleTest(query);
      
      log('Splitting route by day...', 'pending');
      testRunner.openaiCalls++;
      const timeline = await openaiApi.splitRouteByDay(result);
      log('Timeline generation completed', 'success');
      logJSON('Daily Timeline', timeline);
      
      if (!timeline || !Array.isArray(timeline.daily_routes) || timeline.daily_routes.length === 0) {
        throw new Error('Timeline generation did not produce valid daily routes');
      }
    });
    
    // Test 5: Nearby points of interest
    await testRunner.runTest('Nearby Points of Interest', async () => {
      if (!googleMapsApi) {
        throw new Error('Google Maps API module not loaded');
      }
      
      log('Getting nearby interest points...', 'pending');
      testRunner.googleCalls++;
      
      const location = "Colosseum, Rome";
      let points;
      
      if (apiConfig.google.usingReal && apiConfig.google.isConfigured) {
        points = await googleMapsApi.getNearbyInterestPoints(location);
      } else {
        log('Using simulated nearby points data', 'warning');
        points = [
          { id: 'sim1', name: 'Roman Forum', position: { lat: 41.8925, lng: 12.4853 } },
          { id: 'sim2', name: 'Palatine Hill', position: { lat: 41.8892, lng: 12.4875 } }
        ];
      }
      
      log('Nearby points search completed', 'success');
      logJSON('Nearby Points', points);
      
      if (!points || !Array.isArray(points) || points.length === 0) {
        throw new Error('Nearby points search did not return any results');
      }
    });
    
    // Test 6: Validation APIs
    await testRunner.runTest('Transportation Validation', async () => {
      if (!googleMapsApi) {
        throw new Error('Google Maps API module not loaded');
      }
      
      log('Validating transportation...', 'pending');
      testRunner.googleCalls++;
      
      const routeToValidate = {
        departure_site: 'Colosseum, Rome',
        arrival_site: 'Vatican City',
        transportation_type: 'driving'
      };
      
      let validatedRoute;
      
      if (apiConfig.google.usingReal && apiConfig.google.isConfigured) {
        validatedRoute = await googleMapsApi.validateTransportation(routeToValidate);
      } else {
        log('Using simulated validation data', 'warning');
        validatedRoute = {
          ...routeToValidate,
          duration: '25 mins',
          distance: '5.2 km'
        };
      }
      
      log('Transportation validation completed', 'success');
      logJSON('Validated Transportation', validatedRoute);
      
      if (!validatedRoute || !validatedRoute.duration || !validatedRoute.distance) {
        throw new Error('Transportation validation did not return duration/distance');
      }
    });
    
    // Test 7: Interest points validation
    await testRunner.runTest('Interest Points Validation', async () => {
      if (!googleMapsApi) {
        throw new Error('Google Maps API module not loaded');
      }
      
      log('Validating interest points...', 'pending');
      testRunner.googleCalls++;
      
      const baseLocation = 'Colosseum, Rome';
      const pointsToValidate = [
        { name: 'Roman Forum', id: 'p1' },
        { name: 'Trevi Fountain', id: 'p2' },
        { name: 'Spanish Steps', id: 'p3' }
      ];
      
      let validatedPoints;
      
      if (apiConfig.google.usingReal && apiConfig.google.isConfigured) {
        validatedPoints = await googleMapsApi.validateInterestPoints(baseLocation, pointsToValidate);
      } else {
        log('Using simulated validation data', 'warning');
        validatedPoints = [
          { name: 'Roman Forum', id: 'p1', distance: '0.5 km', duration: '6 mins', within_range: true },
          { name: 'Trevi Fountain', id: 'p2', distance: '1.8 km', duration: '22 mins', within_range: true }
        ];
      }
      
      log('Interest points validation completed', 'success');
      logJSON('Validated Points', validatedPoints);
      
      if (!validatedPoints || !Array.isArray(validatedPoints)) {
        throw new Error('Interest points validation did not return array of results');
      }
    });
    
    // Test 8: Route statistics
    await testRunner.runTest('Route Statistics', async () => {
      if (!googleMapsApi) {
        throw new Error('Google Maps API module not loaded');
      }
      
      log('Calculating route statistics...', 'pending');
      testRunner.googleCalls++;
      
      const route = {
        route_duration: '3 days',
        places: ['ChIJjRMREiCLhYARqh3_G0H5CnY', 'ChIJIQBpAG2ahYARCrYCKJZBJVM'],
        sites_included_in_routes: ['Golden Gate Bridge', 'Alcatraz Island']
      };
      
      let statistics;
      
      if (apiConfig.google.usingReal && apiConfig.google.isConfigured) {
        statistics = await googleMapsApi.calculateRouteStatistics(route);
      } else {
        log('Using simulated statistics data', 'warning');
        statistics = {
          sites: route.sites_included_in_routes.length,
          duration: route.route_duration,
          distance: '15 km',
          cost: {
            estimated_total: '$1500',
            entertainment: '$300',
            food: '$400',
            accommodation: '$600',
            transportation: '$200'
          }
        };
      }
      
      log('Route statistics calculation completed', 'success');
      logJSON('Route Statistics', statistics);
      
      if (!statistics || !statistics.cost || !statistics.duration) {
        throw new Error('Route statistics calculation did not return valid data');
      }
    });
    
    testRunner.logSummary();
  });

  // Initialize with a welcome message
  log('TourGuideAI API Test Console initialized', 'success');
  log('Configure API keys and run tests to begin', 'info');
  updateStatus();
}); 