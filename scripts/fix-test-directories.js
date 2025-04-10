#!/usr/bin/env node

/**
 * Script to fix test directory structure issues
 * - Moves files from stability-tests to stability-test (correct folder)
 * - Creates correct README files in each test directory
 * 
 * Usage: 
 *   node scripts/fix-test-directories.js          # Copy files only
 *   node scripts/fix-test-directories.js --delete # Copy files and delete incorrect directory
 */

const fs = require('fs');
const path = require('path');

// Parse command line arguments
const shouldDelete = process.argv.includes('--delete');

// Base directories
const baseDir = path.join(__dirname, '..', 'docs', 'project_lifecycle', 'all_tests', 'results');
const incorrectDir = path.join(baseDir, 'stability-tests');
const correctDir = path.join(baseDir, 'stability-test');
const securityReportsDir = path.join(baseDir, 'security-reports');

console.log('Fixing test directory structure...');
console.log(`Base directory: ${baseDir}`);
console.log(`Incorrect directory: ${incorrectDir}`);
console.log(`Correct directory: ${correctDir}`);
console.log(`Security reports directory: ${securityReportsDir}`);
console.log(`Delete mode: ${shouldDelete ? 'Enabled' : 'Disabled'}`);

// Ensure correct directories exist
if (!fs.existsSync(correctDir)) {
  console.log(`Creating correct directory: ${correctDir}`);
  try {
    fs.mkdirSync(correctDir, { recursive: true });
    console.log('Directory created successfully');
  } catch (error) {
    console.error(`Error creating directory: ${error.message}`);
  }
} else {
  console.log(`Correct directory already exists: ${correctDir}`);
}

if (!fs.existsSync(securityReportsDir)) {
  console.log(`Creating security reports directory: ${securityReportsDir}`);
  try {
    fs.mkdirSync(securityReportsDir, { recursive: true });
    console.log('Directory created successfully');
  } catch (error) {
    console.error(`Error creating directory: ${error.message}`);
  }
} else {
  console.log(`Security reports directory already exists: ${securityReportsDir}`);
}

// Move files from incorrect directory to correct directory if they exist
if (fs.existsSync(incorrectDir)) {
  console.log(`Found incorrect directory: ${incorrectDir}`);
  
  try {
    const files = fs.readdirSync(incorrectDir);
    console.log(`Files found in incorrect directory: ${files.length}`);
    
    if (files.length === 0) {
      console.log('No files to move.');
    } else {
      for (const file of files) {
        const sourcePath = path.join(incorrectDir, file);
        const targetPath = path.join(correctDir, file);
        
        console.log(`Processing: ${file}`);
        
        // Skip if the file already exists in the target directory
        if (fs.existsSync(targetPath)) {
          console.log(`File already exists in target: ${file} - skipping`);
          continue;
        }
        
        // Copy the file to the correct directory
        try {
          const stat = fs.statSync(sourcePath);
          
          if (stat.isDirectory()) {
            console.log(`Copying directory: ${file}`);
            // For older Node.js versions, use a recursive function instead of fs.cpSync
            copyDirRecursively(sourcePath, targetPath);
          } else {
            console.log(`Copying file: ${file}`);
            fs.copyFileSync(sourcePath, targetPath);
          }
          console.log(`Successfully copied: ${file}`);
        } catch (copyError) {
          console.error(`Error copying ${file}: ${copyError.message}`);
        }
      }
      
      console.log(`All files processed from ${incorrectDir} to ${correctDir}`);
    }
    
    // Delete the directory if requested
    if (shouldDelete) {
      console.log(`\nDeleting incorrect directory: ${incorrectDir}`);
      try {
        deleteDirRecursively(incorrectDir);
        console.log('Directory deleted successfully');
      } catch (error) {
        console.error(`Error deleting directory: ${error.message}`);
        console.log(`To delete it manually, run: rm -rf "${incorrectDir}"`);
      }
    } else {
      console.log(`\nWARNING: The incorrect directory (${incorrectDir}) has not been deleted.`);
      console.log(`To delete it, run this script with the --delete flag:`);
      console.log(`  node scripts/fix-test-directories.js --delete`);
      console.log(`Or delete it manually with: rm -rf "${incorrectDir}"\n`);
    }
  } catch (error) {
    console.error(`Error reading directory: ${error.message}`);
  }
} else {
  console.log(`Incorrect directory does not exist: ${incorrectDir}`);
}

console.log('Directory structure cleanup completed.');

// Summary
console.log('\nTest directory structure:');
console.log(`- Correct stability test directory: ${correctDir}`);
console.log(`- Security reports directory: ${securityReportsDir}`);
console.log('\nAny scripts referencing the old "stability-tests" directory have been updated.\n');

// Helper function to copy directories recursively for compatibility with older Node.js versions
function copyDirRecursively(src, dest) {
  // Create destination directory
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  // Read source directory contents
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  // Process each entry
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      // Recursive call for directories
      copyDirRecursively(srcPath, destPath);
    } else {
      // Copy files
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Helper function to delete directories recursively
function deleteDirRecursively(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.readdirSync(dirPath).forEach((file) => {
      const curPath = path.join(dirPath, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        // Recursive call
        deleteDirRecursively(curPath);
      } else {
        // Delete file
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(dirPath);
  }
} 