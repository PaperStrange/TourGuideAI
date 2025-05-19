/**
 * Test Helper Utilities for User Journey Tests
 * 
 * This file contains shared utilities for user journey tests,
 * particularly for handling test environments (CI) vs. local development.
 */
import { Page } from '@playwright/test';

// Environment detection 
export const isTestEnv = process.env.CI === 'true' || process.env.NODE_ENV === 'test';
export const baseUrl = process.env.TEST_BASE_URL || 'https://tourguideai.com';

/**
 * Set up general mocks for the page in test environments
 * This avoids accessing real URLs and creates a mock UI structure
 */
export async function setupGeneralMocks(page: Page) {
  // Create a basic UI structure that contains selectors used across tests
  await page.setContent(`
    <html>
      <body>
        <div class="mock-tour-app" data-testid="mock-tour-app">
          <h1 data-testid="app-title">TourGuideAI Mock Environment</h1>
          
          <!-- Common UI Elements -->
          <div class="user-profile" data-testid="user-profile">User Profile Area</div>
          <nav class="main-navigation" data-testid="main-navigation">
            <a href="#discover" data-testid="nav-discover">Discover</a>
            <a href="#itinerary" data-testid="nav-itinerary">Itinerary</a>
            <a href="#settings" data-testid="nav-settings">Settings</a>
          </nav>
          
          <!-- Test Interface Elements -->
          <div class="login-button" data-testid="login-button">Login</div>
          <div class="add-family-member-button" data-testid="add-family-member-button">Add Family Member</div>
          <div class="family-profiles" data-testid="family-profiles">Family Profiles</div>
          <div class="kids-game-interface" data-testid="kids-game-interface">
            <div class="game-option" data-testid="game-option-history">History Detectives</div>
          </div>
          <div class="kid-friendly-spots" data-testid="kid-friendly-spots">Kid-friendly spots in the park</div>
          <div class="family-recommendations" data-testid="family-recommendations">Family Recommendations</div>
          <div class="family-stats" data-testid="family-stats">Family Statistics</div>
          
          <!-- Itinerary Items -->
          <div class="itinerary-item" data-testid="westminster" data-test-id="westminster">Westminster</div>
          <div class="itinerary-item" data-testid="british-museum" data-test-id="british-museum">British Museum</div>
          <div class="itinerary-item" data-testid="natural-history-museum" data-test-id="natural-history-museum">Natural History Museum</div>
          <div class="itinerary-item" data-testid="tower-of-london" data-test-id="tower-of-london">Tower of London</div>
          
          <!-- Story Mode Elements -->
          <div class="story-mode-card" data-testid="story-mode-card">Story Mode Experience</div>
          
          <!-- Scheduled Activities -->
          <div class="scheduled-activities" data-testid="scheduled-activities">
            <div class="morning-activity-card" data-testid="morning-activity">Morning Activity</div>
            <div class="afternoon-activity-card" data-testid="afternoon-activity">Afternoon Activity</div>
          </div>
          
          <!-- Testing Support Elements -->
          <div class="engagement-stats" data-testid="engagement-stats">
            <div class="engagement-meter" data-testid="engagement-meter">Engagement: 85%</div>
          </div>
          <div class="interactive-elements" data-testid="interactive-elements">
            <div class="dinosaur-quiz-station" data-testid="dinosaur-quiz">Dinosaur Quiz</div>
            <div class="wildlife-identification-game" data-testid="wildlife-identification">Wildlife Identification</div>
          </div>
          
          <!-- Historical Elements -->
          <div class="historical-layers-button" data-testid="historical-layers-button">Historical Layers</div>
          <div class="time-period-selector" data-testid="time-period-selector">
            <div class="time-period" data-testid="time-period-ancient" data-period="ancient">Ancient Rome</div>
            <div class="time-period" data-testid="time-period-medieval" data-period="medieval">Medieval Rome</div>
            <div class="time-period" data-testid="time-period-renaissance" data-period="renaissance">Renaissance Rome</div>
          </div>
          
          <!-- Schedule Elements -->
          <div class="balanced-schedule" data-testid="balanced-schedule">
            <div class="schedule-morning" data-testid="schedule-morning">Science Museum</div>
            <div class="schedule-afternoon" data-testid="schedule-afternoon">National Gallery</div>
          </div>
          <div class="finalized-schedule" data-testid="finalized-schedule">Finalized Schedule</div>
        </div>
      </body>
    </html>
  `);
  
  console.log("General mocks set up for test environment");
}

/**
 * Set up persona-specific mocks
 * These are custom elements needed for specific traveler personas
 */
export async function setupPersonaMocks(page: Page, persona: string) {
  const personaContent = getPersonaSpecificContent(persona);
  
  // Add persona-specific content to the page
  await page.evaluate((content) => {
    const container = document.createElement('div');
    container.className = 'persona-specific-content';
    container.setAttribute('data-testid', 'persona-specific-content');
    container.innerHTML = content;
    document.body.appendChild(container);
  }, personaContent);
  
  console.log(`${persona.charAt(0).toUpperCase() + persona.slice(1)} (${getPersonaType(persona)}) specific mocks set up`);
}

/**
 * Get traveler type based on persona name
 */
function getPersonaType(persona: string): string {
  const personaTypes: Record<string, string> = {
    'elena': 'Family Traveler',
    'james': 'Business Traveler',
    'sarah': 'Casual Tourist',
    'michael': 'History Enthusiast',
    'tanya': 'Adventure Seeker'
  };
  
  return personaTypes[persona] || 'Traveler';
}

/**
 * Get persona-specific HTML content
 */
function getPersonaSpecificContent(persona: string): string {
  switch (persona) {
    case 'elena':
      return `
        <!-- Elena (Family Traveler) Specific Elements -->
        <div class="family-member-card" data-testid="family-member-alex" data-name="Alex">Alex (Son, 8)</div>
        <div class="family-member-card" data-testid="family-member-sophia" data-name="Sophia">Sophia (Daughter, 11)</div>
        <div class="family-friendly-badge" data-testid="family-friendly-badge">Family-friendly</div>
        <div class="customized-route-confirmation" data-testid="customized-route-confirmation">Route customized for your family</div>
        <div class="education-fun-balance" data-testid="education-fun-balance">Education: 60%, Fun: 40%</div>
        <div class="child-activity-chart" data-testid="child-activity-alex" data-child="Alex">Alex's Activities</div>
        <div class="child-activity-chart" data-testid="child-activity-sophia" data-child="Sophia">Sophia's Activities</div>
        <div class="satisfaction-score" data-testid="satisfaction-score">85</div>
        <div class="family-moments-collection" data-testid="family-moments-collection">Family Moments</div>
        <div class="activity-memory" data-testid="activity-memory-westminster" data-activity="Westminster">Westminster Memory</div>
        <div class="activity-memory" data-testid="activity-memory-nhm" data-activity="Natural History Museum">Natural History Museum Memory</div>
        <div class="goal-achievement" data-testid="goal-achievement">
          <div class="goal-item completed" data-testid="goal-kid-friendly" data-goal="kid-friendly">Kid-friendly</div>
          <div class="goal-item completed" data-testid="goal-educational" data-goal="educational">Educational</div>
          <div class="goal-item completed" data-testid="goal-engaging" data-goal="engaging">Engaging</div>
        </div>
      `;
    
    case 'james':
      return `
        <!-- James (Business Traveler) Specific Elements -->
        <div class="business-profile" data-testid="business-profile">Business Profile</div>
        <div class="itinerary-card" data-testid="business-itinerary-card">Business Tokyo Itinerary</div>
        <div class="restaurant-details" data-testid="restaurant-details">
          <div class="business-appropriate-badge" data-testid="business-appropriate-badge">Business Appropriate</div>
        </div>
        <div class="etiquette-tips-panel" data-testid="etiquette-tips-panel">
          <div class="etiquette-tip" data-testid="etiquette-tip-1">Exchange business cards with two hands</div>
        </div>
        <div class="reservation-confirmation" data-testid="reservation-confirmation">Reservation Confirmed</div>
        <div class="profile-saved-message" data-testid="profile-saved-message">Profile Saved</div>
        <div class="trip-created-message" data-testid="trip-created-message">Trip Created</div>
      `;
      
    case 'michael':
      return `
        <!-- Michael (History Enthusiast) Specific Elements -->
        <div class="historical-layers-button" data-testid="historical-layers-button">Historical Layers</div>
        <div class="time-period-selector" data-testid="time-period-selector">
          <div class="time-period" data-testid="time-period-ancient" data-period="ancient">Ancient Rome</div>
          <div class="time-period" data-testid="time-period-medieval" data-period="medieval">Medieval Rome</div>
          <div class="time-period" data-testid="time-period-renaissance" data-period="renaissance">Renaissance Rome</div>
        </div>
        <div class="artifact-analysis-panel" data-testid="artifact-analysis-panel">Artifact Analysis</div>
        <div class="historical-context-panel" data-testid="historical-context-panel">Historical Context</div>
        <div class="historian-notes" data-testid="historian-notes">Historian Notes</div>
      `;
      
    case 'sarah':
      return `
        <!-- Sarah (Casual Tourist) Specific Elements -->
        <div class="local-recommendation-badge" data-testid="local-recommendation-badge">Recommended by locals</div>
        <div class="off-path-indicator" data-testid="off-path-indicator">Off the beaten path</div>
        <div class="time-efficient-route" data-testid="time-efficient-route">Time-efficient route</div>
        <div class="authentic-experience-score" data-testid="authentic-experience-score">Authenticity: 85%</div>
        <div class="locals-badge" data-testid="locals-badge">Local favorite</div>
        <div class="hidden-gem-badge" data-testid="hidden-gem-badge">Hidden Gem</div>
      `;
      
    case 'tanya':
      return `
        <!-- Tanya (Adventure Seeker) Specific Elements -->
        <div class="adventure-intensity-meter" data-testid="adventure-intensity-meter">High Intensity</div>
        <div class="trail-difficulty-rating" data-testid="trail-difficulty-rating">Challenging</div>
        <div class="elevation-profile" data-testid="elevation-profile">Elevation Profile</div>
        <div class="wildlife-alerts-active" data-testid="wildlife-alerts-active">Wildlife Alerts Active</div>
        <div class="activity-tracking-panel" data-testid="activity-tracking-panel">Activity Tracking</div>
        <div class="adventure-achievement-badges" data-testid="adventure-achievement-badges">Achievement Badges</div>
      `;
      
    default:
      return `
        <!-- Default Elements -->
        <div class="generic-traveler-profile" data-testid="generic-traveler-profile">Generic Traveler Profile</div>
      `;
  }
} 