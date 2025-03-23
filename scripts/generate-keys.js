/**
 * Key Generation Script
 * 
 * This script generates secure random keys for use in the application.
 * Run with: node scripts/generate-keys.js
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Generate a secure random key of specified length
function generateSecureKey(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

// Generate keys
const jwtSecret = generateSecureKey(32);
const encryptionKey = generateSecureKey(32);

// Create output
const output = `
===== SECURITY KEYS =====
These keys should be kept secret and used in your .env files.
NEVER commit these keys to version control.

JWT_SECRET=${jwtSecret}
ENCRYPTION_KEY=${encryptionKey}

Copy these values to your .env files.
`;

console.log(output);

// Ensure scripts directory exists
const scriptsDir = path.join(__dirname);
if (!fs.existsSync(scriptsDir)) {
  fs.mkdirSync(scriptsDir, { recursive: true });
}

// Write keys to a temporary file that should NOT be committed
const outputFile = path.join(scriptsDir, 'generated-keys.txt');
fs.writeFileSync(outputFile, output);

console.log(`Keys have been saved to: ${outputFile}`);
console.log('IMPORTANT: Do not commit this file to version control.');
console.log('Add it to .gitignore if not already included.'); 