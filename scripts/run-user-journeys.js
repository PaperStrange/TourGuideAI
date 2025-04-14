/**
 * Script to run user journey tests for TourGuideAI application
 * 
 * This script runs Playwright tests that simulate different user personas
 * interacting with the TourGuideAI application.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');

const chalk = require('chalk');
const ora = require('ora');

// Configuration
const USER_JOURNEYS_DIR = path.join(__dirname, '..', 'tests', 'user-journey');
const REPORT_DIR = path.join(__dirname, '..', 'docs', 'project_lifecycle', 'all_tests', 'results', 'user-journey');
const HTML_REPORT_DIR = path.join(__dirname, '..', 'docs', 'project_lifecycle', 'all_tests', 'results', 'user-journey');
const DOCS_DIR = path.join(__dirname, '..', 'docs', 'project_lifecycle', 'all_tests');

// Documentation references
const USER_STORY_DOC = path.join(DOCS_DIR, 'references', 'project.test-user-story.md');
const TEST_INDEX_DOC = path.join(DOCS_DIR, 'references', 'project.test-index.md');
const USER_JOURNEY_README = path.join(DOCS_DIR, 'results', 'user-journey', 'README.md');

// Ensure the report directories exist
if (!fs.existsSync(REPORT_DIR)) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
}

if (!fs.existsSync(HTML_REPORT_DIR)) {
  fs.mkdirSync(HTML_REPORT_DIR, { recursive: true });
}

// User journey tests mapping (with estimated times)
const userJourneys = [
  { 
    name: 'Sarah (Casual Tourist)', 
    file: 'sarah-casual-tourist.spec.ts',
    estimatedTime: '2 minutes',
    description: 'Weekend city exploration in Barcelona'
  },
  { 
    name: 'Michael (History Enthusiast)', 
    file: 'michael-history-enthusiast.spec.ts',
    estimatedTime: '3 minutes',
    description: 'Historical deep dive in Rome'
  },
  { 
    name: 'Elena (Family Traveler)', 
    file: 'elena-family-traveler.spec.ts',
    estimatedTime: '3 minutes',
    description: 'Family-friendly London exploration'
  },
  { 
    name: 'James (Business Traveler)', 
    file: 'james-business-traveler.spec.ts',
    estimatedTime: '2 minutes',
    description: 'Business trip to Tokyo with limited free time'
  },
  { 
    name: 'Tanya (Adventure Seeker)', 
    file: 'tanya-adventure-seeker.spec.ts',
    estimatedTime: '4 minutes',
    description: 'Active exploration of Costa Rica'
  }
];

// Run one specific user journey test
async function runUserJourneyTest(journey, options = {}) {
  const { headless = true, video = false, browser = 'chromium' } = options;
  
  const testFile = path.join(USER_JOURNEYS_DIR, journey.file);
  if (!fs.existsSync(testFile)) {
    console.error(chalk.red(`Test file not found: ${testFile}`));
    return false;
  }

  const spinner = ora(`Running ${journey.name} user journey test (${journey.estimatedTime})...`).start();
  
  try {
    // Build the command with appropriate flags
    let cmd = `npx playwright test ${testFile} --project=${browser}`;
    
    if (headless) {
      cmd += ' --headed false';
    } else {
      cmd += ' --headed';
    }
    
    if (video) {
      cmd += ' --video on';
    }
    
    // Add reporting options
    cmd += ` --reporter=html,line`;
    cmd += ` --output=${HTML_REPORT_DIR}/${journey.name.toLowerCase().replace(/\s+/g, '-')}`;
    
    // Execute the command
    execSync(cmd, { stdio: 'pipe' });
    
    spinner.succeed(chalk.green(`${journey.name} user journey test completed successfully`));
    return true;
  } catch (error) {
    spinner.fail(chalk.red(`${journey.name} user journey test failed`));
    console.error(chalk.red(error.stdout.toString()));
    return false;
  }
}

// Run all user journey tests
async function runAllUserJourneyTests(options = {}) {
  console.log(chalk.blue.bold('Starting TourGuideAI User Journey Tests'));
  console.log(chalk.gray('========================================='));
  
  // Display documentation references
  console.log(chalk.blue('Documentation:'));
  console.log(chalk.gray(`- User stories: ${USER_STORY_DOC}`));
  console.log(chalk.gray(`- Test index: ${TEST_INDEX_DOC}`));
  console.log(chalk.gray(`- User journey test guide: ${USER_JOURNEY_README}`));
  console.log(chalk.gray('========================================='));
  
  const results = [];
  let succeeded = 0;
  let failed = 0;
  
  for (const journey of userJourneys) {
    const success = await runUserJourneyTest(journey, options);
    results.push({
      name: journey.name,
      success,
    });
    
    if (success) {
      succeeded++;
    } else {
      failed++;
    }
    
    // Add a small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Print summary
  console.log(chalk.gray('========================================='));
  console.log(chalk.blue.bold('User Journey Tests Summary:'));
  console.log(chalk.green(`Succeeded: ${succeeded}`));
  console.log(chalk.red(`Failed: ${failed}`));
  console.log(chalk.gray('========================================='));
  
  // List the test results
  for (const result of results) {
    if (result.success) {
      console.log(`${chalk.green('✓')} ${result.name}`);
    } else {
      console.log(`${chalk.red('✗')} ${result.name}`);
    }
  }
  
  console.log(chalk.gray('========================================='));
  console.log(chalk.blue(`HTML Report available at: ${HTML_REPORT_DIR}`));
  
  return failed === 0;
}

// Process command line arguments
function parseArguments() {
  const args = process.argv.slice(2);
  const options = {
    headless: true,
    video: false,
    browser: 'chromium',
    specificJourney: null
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--headed' || arg === '-h') {
      options.headless = false;
    } else if (arg === '--video' || arg === '-v') {
      options.video = true;
    } else if (arg === '--browser' || arg === '-b') {
      options.browser = args[++i] || 'chromium';
    } else if (arg === '--journey' || arg === '-j') {
      options.specificJourney = args[++i];
    }
  }
  
  return options;
}

// Main function
async function main() {
  const options = parseArguments();
  
  if (options.specificJourney) {
    const journey = userJourneys.find(j => 
      j.file.includes(options.specificJourney) || 
      j.name.toLowerCase().includes(options.specificJourney.toLowerCase())
    );
    
    if (journey) {
      console.log(chalk.blue(`Running specific user journey: ${journey.name}`));
      await runUserJourneyTest(journey, options);
    } else {
      console.error(chalk.red(`User journey not found: ${options.specificJourney}`));
      console.log(chalk.gray('Available user journeys:'));
      userJourneys.forEach(j => {
        console.log(`- ${j.name} (${j.description})`);
      });
    }
  } else {
    const success = await runAllUserJourneyTests(options);
    process.exit(success ? 0 : 1);
  }
}

// Run the main function
if (require.main === module) {
  main().catch(error => {
    console.error(chalk.red('An error occurred:'), error);
    process.exit(1);
  });
}

module.exports = {
  runUserJourneyTest,
  runAllUserJourneyTests,
  userJourneys
}; 