/**
 * Shared utility functions for TourGuideAI scripts
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for terminal output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

/**
 * Print formatted status message to console
 * @param {string} message - Message to display
 * @param {string} type - Message type (info, success, error, warning)
 */
function log(message, type = 'info') {
  let prefix = '';
  
  switch (type) {
    case 'success':
      prefix = `${colors.green}✓${colors.reset} `;
      break;
    case 'error':
      prefix = `${colors.red}✗${colors.reset} `;
      break;
    case 'warning':
      prefix = `${colors.yellow}⚠${colors.reset} `;
      break;
    case 'info':
      prefix = `${colors.blue}ℹ${colors.reset} `;
      break;
    default:
      prefix = '';
  }
  
  console.log(`${prefix}${message}`);
}

/**
 * Generate a timestamp string for file naming
 * @returns {string} Formatted timestamp
 */
function getTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

/**
 * Ensure directory exists, create if not
 * @param {string} dirPath - Directory path to ensure
 */
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    log(`Created directory: ${dirPath}`, 'info');
  }
  return dirPath;
}

/**
 * Create a latest.html file that redirects to the most recent report
 * @param {string} reportDir - Directory containing reports
 * @param {string} reportFile - Path to the latest report file
 */
function createLatestRedirect(reportDir, reportFile) {
  const latestHtml = `
  <!DOCTYPE html>
  <html>
    <head>
      <meta http-equiv="refresh" content="0; url='./${path.basename(reportFile)}'" />
    </head>
    <body>
      <p>Redirecting to latest report...</p>
    </body>
  </html>
  `;
  
  const latestPath = path.join(reportDir, 'latest.html');
  fs.writeFileSync(latestPath, latestHtml);
  log(`Created redirect to latest report: ${latestPath}`, 'success');
}

/**
 * Print a box header for scripts
 * @param {string} title - Title to display in the box
 * @param {Object} data - Key-value pairs to display in the box
 */
function printBoxHeader(title, data = {}) {
  // Find the longest line for proper padding
  const lines = [title, ...Object.entries(data).map(([key, value]) => `${key}: ${value}`)];
  const longestLine = Math.max(...lines.map(line => line.length));
  const boxWidth = longestLine + 4; // 4 = padding (2 chars each side)
  
  // Create the box
  console.log(`${colors.bold}┌${'─'.repeat(boxWidth)}┐${colors.reset}`);
  console.log(`${colors.bold}│ ${title.padEnd(boxWidth - 2)} │${colors.reset}`);
  
  if (Object.keys(data).length > 0) {
    console.log(`${colors.bold}├${'─'.repeat(boxWidth)}┤${colors.reset}`);
    
    // Print each entry
    Object.entries(data).forEach(([key, value]) => {
      console.log(`${colors.bold}│ ${`${key}: ${value}`.padEnd(boxWidth - 2)} │${colors.reset}`);
    });
  }
  
  console.log(`${colors.bold}└${'─'.repeat(boxWidth)}┘${colors.reset}`);
}

module.exports = {
  colors,
  log,
  getTimestamp,
  ensureDirectoryExists,
  createLatestRedirect,
  printBoxHeader
}; 