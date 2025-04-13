# Server Scripts

This directory contains utility scripts specific to the TourGuideAI server component.

## Available Scripts

- **rotateToken.js** - Handles API token rotation and renewal for security purposes
  - Usage: `node rotateToken.js`
  
- **test-server.js** - Tests the server's API endpoints and functionality
  - Usage: `node test-server.js`

## Usage

These scripts should be run from the server directory:

```bash
# From project root
cd server
node scripts/rotateToken.js
node scripts/test-server.js

# Or using npm script (if defined in package.json)
npm run rotate-tokens
npm run test-server
``` 