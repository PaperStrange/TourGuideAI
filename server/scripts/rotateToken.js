/**
 * Token Rotation Script
 * 
 * This script allows secure rotation of tokens from the command line.
 * It's designed to be run by administrators when APIs require key rotation.
 */

require('dotenv').config();
const tokenProvider = require('../utils/tokenProvider');
const readline = require('readline');
const { v4: uuidv4 } = require('uuid');

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Service name mapping
const serviceNameMap = {
  '1': 'openai',
  '2': 'google_maps',
  '3': 'auth_jwt',
  '4': 'data_encryption',
  '5': 'sendgrid'
};

// Friendly service names for display
const friendlyNames = {
  'openai': 'OpenAI API',
  'google_maps': 'Google Maps API',
  'auth_jwt': 'JWT Authentication Secret',
  'data_encryption': 'Data Encryption Key',
  'sendgrid': 'SendGrid API'
};

/**
 * List all tokens that need rotation
 */
async function listTokensNeedingRotation() {
  try {
    // Initialize token provider
    await tokenProvider.initialize();
    
    const tokensNeedingRotation = await tokenProvider.getTokensNeedingRotation();
    
    if (tokensNeedingRotation.length === 0) {
      console.log('✅ No tokens currently need rotation.');
      return;
    }
    
    console.log('\n📋 Tokens that need rotation:');
    console.log('=================================================');
    
    tokensNeedingRotation.forEach(token => {
      const friendlyName = friendlyNames[token.serviceName] || token.serviceName;
      console.log(`- ${friendlyName}`);
      console.log(`  Last used: ${new Date(token.lastUsed).toLocaleString()}`);
      console.log(`  Rotation due: ${new Date(token.rotationDue).toLocaleString()}`);
      console.log('-------------------------------------------------');
    });
  } catch (error) {
    console.error('⚠️ Error listing tokens:', error.message);
  }
}

/**
 * List all available tokens
 */
async function listAllTokens() {
  try {
    // Initialize token provider
    await tokenProvider.initialize();
    
    // We need to access the vault service directly for this
    const vaultService = require('../utils/vaultService');
    const secrets = await vaultService.listSecrets();
    
    if (secrets.length === 0) {
      console.log('No tokens found in the vault.');
      return;
    }
    
    console.log('\n📋 All tokens in the vault:');
    console.log('=================================================');
    
    secrets.forEach(secret => {
      const friendlyName = friendlyNames[secret.name] || secret.name;
      console.log(`- ${friendlyName} (${secret.type})`);
      console.log(`  Created: ${new Date(secret.createdAt).toLocaleString()}`);
      console.log(`  Rotation due: ${new Date(secret.rotationDue).toLocaleString()}`);
      console.log(`  Needs rotation: ${secret.needsRotation ? 'Yes' : 'No'}`);
      console.log('-------------------------------------------------');
    });
  } catch (error) {
    console.error('⚠️ Error listing tokens:', error.message);
  }
}

/**
 * Rotate a token
 */
async function rotateToken() {
  try {
    // Initialize token provider
    await tokenProvider.initialize();
    
    console.log('\n🔐 Token Rotation');
    console.log('=================================================');
    console.log('Select the service whose token you want to rotate:');
    console.log('1. OpenAI API');
    console.log('2. Google Maps API');
    console.log('3. JWT Authentication Secret');
    console.log('4. Data Encryption Key');
    console.log('5. SendGrid API');
    
    // Get service selection
    const selection = await new Promise(resolve => {
      rl.question('\nEnter selection (1-5): ', answer => resolve(answer.trim()));
    });
    
    if (!serviceNameMap[selection]) {
      console.log('❌ Invalid selection');
      return;
    }
    
    const serviceName = serviceNameMap[selection];
    const friendlyName = friendlyNames[serviceName];
    
    console.log(`\nRotating token for: ${friendlyName}`);
    
    // If rotating JWT or encryption keys, generate secure random tokens
    let newToken;
    if (serviceName === 'auth_jwt' || serviceName === 'data_encryption') {
      // Generate a secure random token
      newToken = uuidv4() + uuidv4() + uuidv4();
      console.log('\n✅ Generated a secure random token');
    } else {
      // Get the new token from user input
      newToken = await new Promise(resolve => {
        rl.question('\nEnter the new token value: ', answer => resolve(answer.trim()));
      });
    }
    
    // Confirm rotation
    const confirmation = await new Promise(resolve => {
      rl.question('\n⚠️ Are you sure you want to rotate this token? (yes/no): ', answer => resolve(answer.toLowerCase().trim()));
    });
    
    if (confirmation !== 'yes') {
      console.log('\n❌ Token rotation cancelled');
      return;
    }
    
    // Rotate the token
    await tokenProvider.rotateToken(serviceName, newToken);
    
    console.log(`\n✅ Successfully rotated token for ${friendlyName}`);
    
    // Security best practice: clear the token from memory
    newToken = null;
  } catch (error) {
    console.error('⚠️ Error rotating token:', error.message);
  }
}

/**
 * Add a new token
 */
async function addNewToken() {
  try {
    // Initialize token provider
    await tokenProvider.initialize();
    
    console.log('\n🔑 Add New Token');
    console.log('=================================================');
    console.log('Select the service for the new token:');
    console.log('1. OpenAI API');
    console.log('2. Google Maps API');
    console.log('3. JWT Authentication Secret');
    console.log('4. Data Encryption Key');
    console.log('5. SendGrid API');
    
    // Get service selection
    const selection = await new Promise(resolve => {
      rl.question('\nEnter selection (1-5): ', answer => resolve(answer.trim()));
    });
    
    if (!serviceNameMap[selection]) {
      console.log('❌ Invalid selection');
      return;
    }
    
    const serviceName = serviceNameMap[selection];
    const friendlyName = friendlyNames[serviceName];
    
    console.log(`\nAdding token for: ${friendlyName}`);
    
    // If adding JWT or encryption keys, generate secure random tokens
    let tokenValue;
    if (serviceName === 'auth_jwt' || serviceName === 'data_encryption') {
      // Generate a secure random token
      tokenValue = uuidv4() + uuidv4() + uuidv4();
      console.log('\n✅ Generated a secure random token');
    } else {
      // Get the token value from user input
      tokenValue = await new Promise(resolve => {
        rl.question('\nEnter the token value: ', answer => resolve(answer.trim()));
      });
    }
    
    // Store the token
    await tokenProvider.storeToken(serviceName, tokenValue);
    
    console.log(`\n✅ Successfully added token for ${friendlyName}`);
    
    // Security best practice: clear the token from memory
    tokenValue = null;
  } catch (error) {
    console.error('⚠️ Error adding token:', error.message);
  }
}

/**
 * Main menu
 */
async function mainMenu() {
  console.log('\n🛡️  TourGuideAI Token Management');
  console.log('=================================================');
  console.log('1. List tokens that need rotation');
  console.log('2. List all tokens');
  console.log('3. Rotate a token');
  console.log('4. Add a new token');
  console.log('5. Exit');
  
  const choice = await new Promise(resolve => {
    rl.question('\nEnter your choice (1-5): ', answer => resolve(answer.trim()));
  });
  
  switch (choice) {
    case '1':
      await listTokensNeedingRotation();
      await mainMenu();
      break;
    case '2':
      await listAllTokens();
      await mainMenu();
      break;
    case '3':
      await rotateToken();
      await mainMenu();
      break;
    case '4':
      await addNewToken();
      await mainMenu();
      break;
    case '5':
      console.log('\n👋 Goodbye!');
      rl.close();
      break;
    default:
      console.log('\n❌ Invalid choice');
      await mainMenu();
      break;
  }
}

// Start the application
console.log('🔐 TourGuideAI Token Rotation Tool 🔐');
console.log('=================================================');
console.log('This tool helps you securely manage and rotate API tokens.');
console.log('WARNING: Only run this in a secure environment!');

mainMenu().catch(error => {
  console.error('Fatal error:', error);
  rl.close();
}); 