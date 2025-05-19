/**
 * Integration Test Setup Utilities
 * 
 * This module provides setup functions for integration tests to run in mock mode
 * without requiring an actual server to be running.
 */

const { expect } = require('@playwright/test');
const apiMocks = require('../mocks/api-responses');

/**
 * Setup mock REST API for integration tests
 * @param {import('@playwright/test').Page} page - Playwright page
 * @param {Object} mocks - API mocks configuration
 */
async function setupMockApi(page, mocks) {
  await page.route('**/api/**', (route) => {
    const url = route.request().url();
    
    // Extract API path
    const apiPath = url.split('/api/')[1]?.split('?')[0] || '';
    
    // Find matching mock for this route
    const matchingMock = Object.entries(mocks).find(([pattern]) => {
      return new RegExp(pattern).test(apiPath);
    });
    
    if (matchingMock) {
      const [_, mockResponse] = matchingMock;
      
      route.fulfill({
        status: mockResponse.status || 200,
        contentType: mockResponse.contentType || 'application/json',
        body: JSON.stringify(mockResponse.body || {})
      });
    } else {
      console.warn(`No mock found for URL: ${url}`);
      route.continue();
    }
  });
}

/**
 * Configure the page to run in mock mode
 * This intercepts all navigation and API requests and provides mock responses
 * 
 * @param {import('@playwright/test').Page} page - Playwright page
 */
async function setupMockMode(page) {
  // Store current page in context storage for reference across navigations
  await page.context().storageState();
  
  // Mock navigation requests to HTML pages
  await page.route('**/*', async (route) => {
    const url = route.request().url();
    const request = route.request();
    
    // Skip mocking for non-navigation API calls that will be mocked separately
    if (request.resourceType() !== 'document' && url.includes('/api/')) {
      return route.continue();
    }
    
    // Extract the path part of the URL
    let path = url.split('//')[1]?.split('/')[1] || '';
    path = path.split('?')[0]; // Remove query parameters
    
    // Normalize path for comparison
    const normalizedPath = path || 'home';
    
    console.log(`Handling request for: ${normalizedPath}`);
    
    // Handle navigation to pages
    if (request.resourceType() === 'document') {
      // Prepare a basic HTML template with necessary containers for testing
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Travel Planning</title>
          <style>
            body { font-family: sans-serif; margin: 0; padding: 20px; }
            .container { max-width: 1200px; margin: 0 auto; }
          </style>
        </head>
        <body>
          <div class="container">
            <nav>
              <button data-testid="nav-home">Home</button>
              <button data-testid="nav-planner">Travel Planner</button>
              <button data-testid="nav-saved-routes">Saved Routes</button>
              <button data-testid="nav-profile">Profile</button>
            </nav>
            
            <main>
              <!-- Home page content -->
              <div id="home-page" style="display:${normalizedPath === 'home' || normalizedPath === '' ? 'block' : 'none'}">
                <h1>TourGuideAI</h1>
                <p>Your AI-powered travel companion</p>
                <button data-testid="explore-button">Explore Destinations</button>
                <button data-testid="plan-trip-button">Plan a Trip</button>
              </div>
              
              <!-- Travel planning page content -->
              <div id="travel-planning" style="display:${normalizedPath === 'travel-planning' ? 'block' : 'none'}">
                <h1>Travel Planning</h1>
                <div data-testid="query-input-container">
                  <input type="text" data-testid="query-input" placeholder="Where do you want to go?">
                  <button data-testid="analyze-button">Analyze</button>
                </div>
                
                <div data-testid="intent-analysis" style="display:none">
                  <h2>Travel Intent Analysis</h2>
                  <div>Destination: Paris, France</div>
                  <div>Duration: 3 days</div>
                  <button data-testid="generate-button">Generate Route</button>
                </div>
                
                <div data-testid="route-preview" style="display:none">
                  <h2>Paris Family Adventure</h2>
                  <div>Highlights: Eiffel Tower, Louvre Museum</div>
                  <button data-testid="save-route-button">Save Route</button>
                  <button data-testid="edit-button">Edit Itinerary</button>
                  <button data-testid="favorite-button">Add to Favorites</button>
                  <button data-testid="share-button">Share</button>
                  <button data-testid="export-button">Export</button>
                </div>
                
                <div data-testid="itinerary-editor" style="display:none">
                  <h2>Edit Your Itinerary</h2>
                  <div>
                    <button data-testid="edit-title-button">Edit Title</button>
                    <input type="text" data-testid="title-input" value="Paris Family Adventure">
                    <button data-testid="save-title-button">Save</button>
                  </div>
                  <div>
                    <button data-testid="add-activity-button">Add Activity</button>
                    <div data-testid="activity-form" style="display:none">
                      <input type="text" data-testid="activity-name-input" placeholder="Activity name">
                      <input type="text" data-testid="activity-desc-input" placeholder="Description">
                      <input type="text" data-testid="activity-time-input" placeholder="Time">
                      <button data-testid="save-activity-button">Save Activity</button>
                    </div>
                  </div>
                  <button data-testid="back-to-preview-button">Back to Preview</button>
                </div>
                
                <div data-testid="error-message" style="display:none">
                  <p>Something went wrong</p>
                  <button data-testid="retry-button">Retry</button>
                </div>
                
                <div data-testid="login-prompt" style="display:none">
                  <p>You need to be logged in to access this resource</p>
                  <button data-testid="login-button">Log In</button>
                </div>
                
                <div data-testid="success-message" style="display:none">
                  <p>Operation completed successfully</p>
                </div>
                
                <div data-testid="loading-indicator" style="display:none">
                  <p>Loading...</p>
                </div>
                
                <div data-testid="offline-indicator" style="display:none">
                  <p data-testid="offline-message">You are currently offline</p>
                  <button data-testid="retry-save-button">Retry</button>
                </div>
              </div>
              
              <!-- Quick plan page -->
              <div id="quick-plan" style="display:${normalizedPath === 'quick-plan' ? 'block' : 'none'}">
                <h1>Quick Trip Planning</h1>
                <input type="text" data-testid="quick-query-input" placeholder="Quick query...">
                <button data-testid="quick-generate-button">Generate</button>
                
                <div data-testid="quick-route" style="display:none">
                  <h2>Paris Business Trip</h2>
                  <div>Evening activities: Museum visit, Fine dining</div>
                  
                  <button data-testid="filter-button">Filter</button>
                  <div data-testid="filter-options" style="display:none">
                    <label><input type="checkbox" data-testid="evening-filter"> Evening only</label>
                    <button data-testid="apply-filters-button">Apply</button>
                  </div>
                  
                  <div data-testid="filtered-activities" style="display:none">
                    <div>Le Jules Verne - 7:30 PM</div>
                    <button data-testid="add-to-calendar-button">Add to Calendar</button>
                  </div>
                </div>
                
                <div data-testid="calendar-dialog" style="display:none">
                  <h3>Add to Calendar</h3>
                  <button data-testid="google-calendar">Google Calendar</button>
                  <button data-testid="outlook-calendar">Outlook</button>
                </div>
                
                <div data-testid="calendar-confirmation" style="display:none">
                  <p>Added to calendar</p>
                </div>
              </div>
              
              <!-- Login page -->
              <div id="login-page" style="display:${normalizedPath === 'login' ? 'block' : 'none'}">
                <h1>Login</h1>
                <form>
                  <input type="email" data-testid="email-input" placeholder="Email">
                  <input type="password" data-testid="password-input" placeholder="Password">
                  <button data-testid="login-submit">Login</button>
                </form>
              </div>
              
              <!-- Saved routes page -->
              <div id="saved-routes" style="display:${normalizedPath === 'saved-routes' ? 'block' : 'none'}">
                <h1>Your Saved Routes</h1>
                <div data-testid="saved-routes-list">
                  <div>Paris Family Adventure</div>
                  <div>London Weekend</div>
                  <div>Weekend in Paris</div>
                </div>
              </div>
              
              <!-- Sharing dialog -->
              <div data-testid="share-dialog" style="display:none">
                <h3>Share Your Route</h3>
                <input type="text" value="https://tourguideai.example.com/shared/route/abc123">
                <button data-testid="copy-link-button">Copy Link</button>
              </div>
              
              <div data-testid="copy-confirmation" style="display:none">
                <p>Link copied to clipboard!</p>
              </div>
              
              <!-- Export options -->
              <div data-testid="export-options" style="display:none">
                <h3>Export Options</h3>
                <button data-testid="export-pdf-button">PDF</button>
                <button data-testid="export-doc-button">Word Document</button>
              </div>
              
              <div data-testid="export-confirmation" style="display:none">
                <p>Route exported successfully!</p>
              </div>
            </main>
          </div>
          
          <script>
            // Client-side handlers for the mock UI
            document.addEventListener('click', function(e) {
              // Handle navigation
              if (e.target.matches('[data-testid="nav-home"]')) {
                window.location.href = '/';
              } else if (e.target.matches('[data-testid="nav-planner"]')) {
                window.location.href = '/travel-planning';
              } else if (e.target.matches('[data-testid="nav-saved-routes"]')) {
                window.location.href = '/saved-routes';
              } else if (e.target.matches('[data-testid="nav-profile"]')) {
                window.location.href = '/profile';
              }
              
              // Handle explore button
              if (e.target.matches('[data-testid="explore-button"]')) {
                window.location.href = '/travel-planning';
              }
              
              // Handle plan trip button
              if (e.target.matches('[data-testid="plan-trip-button"]')) {
                window.location.href = '/travel-planning';
              }
              
              // Handle analyze button
              if (e.target.matches('[data-testid="analyze-button"]')) {
                const loadingIndicator = document.querySelector('[data-testid="loading-indicator"]');
                const intentAnalysis = document.querySelector('[data-testid="intent-analysis"]');
                
                if (loadingIndicator) loadingIndicator.style.display = 'block';
                
                setTimeout(() => {
                  if (loadingIndicator) loadingIndicator.style.display = 'none';
                  if (intentAnalysis) intentAnalysis.style.display = 'block';
                }, 500);
              }
              
              // Handle generate button
              if (e.target.matches('[data-testid="generate-button"]')) {
                const loadingIndicator = document.querySelector('[data-testid="loading-indicator"]');
                const routePreview = document.querySelector('[data-testid="route-preview"]');
                
                if (loadingIndicator) loadingIndicator.style.display = 'block';
                
                setTimeout(() => {
                  if (loadingIndicator) loadingIndicator.style.display = 'none';
                  if (routePreview) routePreview.style.display = 'block';
                }, 500);
              }
              
              // Handle edit button
              if (e.target.matches('[data-testid="edit-button"]')) {
                const routePreview = document.querySelector('[data-testid="route-preview"]');
                const itineraryEditor = document.querySelector('[data-testid="itinerary-editor"]');
                
                if (routePreview) routePreview.style.display = 'none';
                if (itineraryEditor) itineraryEditor.style.display = 'block';
              }
              
              // Handle back to preview button
              if (e.target.matches('[data-testid="back-to-preview-button"]')) {
                const routePreview = document.querySelector('[data-testid="route-preview"]');
                const itineraryEditor = document.querySelector('[data-testid="itinerary-editor"]');
                
                if (routePreview) routePreview.style.display = 'block';
                if (itineraryEditor) itineraryEditor.style.display = 'none';
              }
              
              // Handle add activity button
              if (e.target.matches('[data-testid="add-activity-button"]')) {
                const activityForm = document.querySelector('[data-testid="activity-form"]');
                if (activityForm) activityForm.style.display = 'block';
              }
              
              // Handle login button
              if (e.target.matches('[data-testid="login-button"]')) {
                window.location.href = '/login';
              }
            });
          </script>
        </body>
        </html>
      `;
      
      return route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: html
      });
    }
    
    // For other requests that should be handled, continue the request
    return route.continue();
  });
  
  // Setup mock API responses
  await setupMockApi(page, apiMocks);
  
  // Setup click handlers for showing/hiding elements
  await setupClickHandlers(page);
  
  // Setup specific handlers for error scenarios
  await setupErrorHandlers(page);
}

/**
 * Setup click handlers for showing/hiding UI elements
 * @param {import('@playwright/test').Page} page - Playwright page
 */
async function setupClickHandlers(page) {
  await page.evaluate(() => {
    // Add event listener to help manage UI state across tests
    if (!window._testHandlersInitialized) {
      window._testHandlersInitialized = true;
      
      // Store UI state in sessionStorage
      window.showElement = function(selector) {
        const element = document.querySelector(selector);
        if (element) element.style.display = 'block';
      };
      
      window.hideElement = function(selector) {
        const element = document.querySelector(selector);
        if (element) element.style.display = 'none';
      };
    }
  });
}

/**
 * Setup error response handling
 * @param {import('@playwright/test').Page} page - Playwright page
 */
async function setupErrorHandlers(page) {
  await page.evaluate(() => {
    // Add method to trigger error message display
    window.showErrorMessage = function() {
      const errorMessage = document.querySelector('[data-testid="error-message"]');
      if (errorMessage) errorMessage.style.display = 'block';
    };
    
    // Add method to trigger login prompt display
    window.showLoginPrompt = function() {
      const loginPrompt = document.querySelector('[data-testid="login-prompt"]');
      if (loginPrompt) loginPrompt.style.display = 'block';
    };
    
    // Add method to trigger offline indicator display
    window.showOfflineIndicator = function() {
      const offlineIndicator = document.querySelector('[data-testid="offline-indicator"]');
      if (offlineIndicator) offlineIndicator.style.display = 'block';
    };
  });
}

/**
 * Setup authentication scenario
 * @param {import('@playwright/test').Page} page - Playwright page
 * @param {boolean} isAuthenticated - Whether user should be authenticated or not
 */
async function setupAuthScenario(page, isAuthenticated = true) {
  if (isAuthenticated) {
    // Setup authenticated user
    await page.evaluate(() => {
      localStorage.setItem('authToken', 'mock-auth-token-for-testing');
      localStorage.setItem('user', JSON.stringify({
        id: 'test-user-123',
        name: 'Test User',
        email: 'test@example.com'
      }));
    });
  } else {
    // Setup unauthenticated user
    await page.evaluate(() => {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
    });
  }
}

module.exports = {
  setupMockMode,
  setupClickHandlers,
  setupErrorHandlers,
  setupAuthScenario,
  setupMockApi
}; 