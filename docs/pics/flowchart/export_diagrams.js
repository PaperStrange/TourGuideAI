/**
 * Export Diagrams Script
 * 
 * This script converts Mermaid diagram definitions to SVG and PNG files.
 * 
 * Prerequisites:
 * - Node.js installed
 * - @mermaid-js/mermaid-cli installed globally
 *   Install using: npm install -g @mermaid-js/mermaid-cli
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const diagrams = [
  { 
    input: '.mermaidfilesmap', 
    output: 'project_documentation_map',
    title: 'TourGuideAI Documentation Map'
  },
  { 
    input: '.mermaidworkflow', 
    output: 'project_workflow',
    title: 'TourGuideAI Project Workflow'
  }
];

/**
 * Check if Mermaid CLI is installed
 * @returns {boolean} Whether Mermaid CLI is available
 */
function checkMermaidCli() {
  try {
    execSync('mmdc --version', { stdio: 'ignore' });
    console.log('✓ Mermaid CLI is installed.');
    return true;
  } catch (error) {
    console.error('✗ Mermaid CLI is not installed or not in PATH.');
    console.log('Please install it using: npm install -g @mermaid-js/mermaid-cli');
    console.log('If you cannot install it, please use the HTML viewer at:');
    console.log('  docs/pics/flowchart/mermaid_renderer.html instead.');
    return false;
  }
}

/**
 * Extract Mermaid content from a file
 * @param {string} filePath - Path to the file containing Mermaid code
 * @returns {string|null} - The extracted Mermaid code or null
 */
function extractMermaidContent(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const match = content.match(/```mermaid\s*([\s\S]*?)\s*```/);
    if (!match) {
      console.error(`Could not extract Mermaid diagram from ${filePath}`);
      return null;
    }
    return match[1];
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Generate SVG and PNG files from Mermaid content
 * @param {string} mermaidContent - The Mermaid diagram code
 * @param {string} tempPath - Path for the temporary Mermaid file
 * @param {string} outputBaseName - Base name for output files (without extension)
 * @param {boolean} generatePng - Whether to generate PNG in addition to SVG
 * @returns {boolean} - Success or failure
 */
function generateDiagramFiles(mermaidContent, tempPath, outputBaseName, generatePng = true) {
  try {
    // Create directory if it doesn't exist
    const outputDir = path.dirname(outputBaseName);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Write to temporary file
    fs.writeFileSync(tempPath, mermaidContent, 'utf8');
    
    // Generate SVG
    const svgOutputPath = `${outputBaseName}.svg`;
    console.log(`Generating ${svgOutputPath}...`);
    execSync(`mmdc -i "${tempPath}" -o "${svgOutputPath}" -b transparent`, { stdio: 'inherit' });
    
    // Generate PNG if requested
    if (generatePng) {
      const pngOutputPath = `${outputBaseName}.png`;
      console.log(`Generating ${pngOutputPath}...`);
      execSync(`mmdc -i "${tempPath}" -o "${pngOutputPath}" -w 1920 -H 1080`, { stdio: 'inherit' });
    }
    
    return true;
  } catch (error) {
    console.error(`Error generating diagrams:`, error.message);
    return false;
  }
}

/**
 * Clean up temporary files
 * @param {string[]} tempPaths - Paths to temporary files to remove
 */
function cleanupTempFiles(tempPaths) {
  for (const tempPath of tempPaths) {
    try {
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
    } catch (error) {
      console.error(`Error removing temporary file ${tempPath}:`, error.message);
    }
  }
}

/**
 * Main function to export all diagrams
 */
function exportAllDiagrams() {
  // Check if Mermaid CLI is installed
  if (!checkMermaidCli()) {
    process.exit(1);
  }
  
  console.log('Starting diagram export...');
  const tempFiles = [];
  let success = true;
  
  // Process each diagram
  for (const diagram of diagrams) {
    const inputPath = path.join(__dirname, diagram.input);
    const outputBaseName = path.join(__dirname, diagram.output);
    const tempPath = path.join(__dirname, `${diagram.input}.temp`);
    tempFiles.push(tempPath);
    
    // Check if input file exists
    if (!fs.existsSync(inputPath)) {
      console.error(`Input file not found: ${inputPath}`);
      success = false;
      continue;
    }
    
    // Extract Mermaid content and generate diagrams
    const mermaidContent = extractMermaidContent(inputPath);
    if (mermaidContent) {
      if (!generateDiagramFiles(mermaidContent, tempPath, outputBaseName)) {
        success = false;
      }
    } else {
      success = false;
    }
  }
  
  // Clean up temporary files
  cleanupTempFiles(tempFiles);
  
  // Report results
  if (success) {
    console.log('✓ All diagrams exported successfully!');
  } else {
    console.log('⚠ Some diagrams could not be exported. Check the errors above.');
    console.log('You can still use the HTML viewer: docs/pics/flowchart/mermaid_renderer.html');
  }
}

// Run the export
exportAllDiagrams(); 