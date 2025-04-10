/**
 * Key Generation Script
 * 
 * This script generates secure random keys for use in the application.
 * Run with: node scripts/generate-keys.js
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Create utils directory if it doesn't exist
const utilsDir = path.join(__dirname, 'utils');
if (!fs.existsSync(utilsDir)) {
  fs.mkdirSync(utilsDir, { recursive: true });
}

// Try to use the utility functions if available
let utils;
try {
  utils = require('./utils/scriptHelpers');
} catch (err) {
  // Simplified inline version if the utils aren't available
  utils = {
    log: (msg) => console.log(msg),
    colors: { green: '', red: '', yellow: '', reset: '', bold: '' },
    ensureDirectoryExists: (dir) => {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      return dir;
    }
  };
}

// Print header
utils.printBoxHeader('TourGuideAI Key Generator', {
  'Output': 'scripts/generated-keys.txt',
  'Timestamp': new Date().toISOString()
});

// Generate a secure random key of specified length
function generateSecureKey(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

// Generate security keys
const jwtSecret = generateSecureKey(32);
const encryptionKey = generateSecureKey(32);
const vaultEncryptionKey = generateSecureKey(32);
const keySalt = generateSecureKey(16);
const vaultSalt = generateSecureKey(16);
const sendgridSecret = generateSecureKey(32);

// Create output
const output = `
===== SECURITY KEYS =====
Generated on: ${new Date().toISOString()}
These keys should be kept secret and used in your .env files.
NEVER commit these keys to version control.

# Authentication
JWT_SECRET=${jwtSecret}

# Data encryption
ENCRYPTION_KEY=${encryptionKey}
KEY_SALT=${keySalt}

# Token vault security
VAULT_ENCRYPTION_KEY=${vaultEncryptionKey}
VAULT_SALT=${vaultSalt}

# Third-party services
SENDGRID_API_KEY=${sendgridSecret}

Copy these values to your .env files.
`;

console.log(output);

// Ensure scripts directory exists
const scriptsDir = path.join(__dirname);
utils.ensureDirectoryExists(scriptsDir);

// Write keys to a temporary file that should NOT be committed
const outputFile = path.join(scriptsDir, 'generated-keys.txt');
fs.writeFileSync(outputFile, output);

// Create .gitignore entry if it doesn't exist
const gitignoreFile = path.join(__dirname, '..', '.gitignore');
if (fs.existsSync(gitignoreFile)) {
  let gitignoreContent = fs.readFileSync(gitignoreFile, 'utf8');
  if (!gitignoreContent.includes('generated-keys.txt')) {
    fs.appendFileSync(gitignoreFile, '\n# Security keys\nscripts/generated-keys.txt\n');
    utils.log('Updated .gitignore to exclude generated-keys.txt', 'success');
  }
}

utils.log(`Keys have been saved to: ${outputFile}`, 'success');
utils.log('IMPORTANT: Do not commit this file to version control.', 'warning');

utils.log('\nNext steps:', 'info');
utils.log('1. Copy these keys to your .env and server/.env files', 'info');
utils.log('2. Restart your application for the new keys to take effect', 'info');

// List out where each key should go
console.log(`
${utils.colors.bold}Key Placement Guide:${utils.colors.reset}

1. In root .env:
   - JWT_SECRET
   - ENCRYPTION_KEY
   
2. In server/.env:
   - JWT_SECRET
   - ENCRYPTION_KEY
   - KEY_SALT
   - VAULT_ENCRYPTION_KEY
   - VAULT_SALT
   - SENDGRID_API_KEY
`); 