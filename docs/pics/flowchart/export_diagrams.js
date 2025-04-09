// Script to export Mermaid diagrams to PNG
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Export Diagrams Script
 * 
 * This script converts Mermaid diagram definitions to SVG files.
 * 
 * Prerequisites:
 * - Node.js installed
 * - @mermaid-js/mermaid-cli installed globally
 *   Install using: npm install -g @mermaid-js/mermaid-cli
 */

// File paths for diagrams
const filesMapPath = path.join(__dirname, '.mermaidfilesmap');
const workflowPath = path.join(__dirname, '.mermaidworkflow');

// Output paths for PNG files
const outputFilesMapPath = path.join(__dirname, 'project_documentation_map.png');
const outputWorkflowPath = path.join(__dirname, 'project_workflow.png');

// Temporary mermaid files
const tempFilesMapPath = path.join(__dirname, 'temp_filesmap.mmd');
const tempWorkflowPath = path.join(__dirname, 'temp_workflow.mmd');

// Check if mermaid-cli is installed
try {
    execSync('mmdc --version', { stdio: 'ignore' });
    console.log('Mermaid CLI is installed.');
} catch (error) {
    console.error('Mermaid CLI is not installed or not in PATH.');
    console.log('Please install it using: npm install -g @mermaid-js/mermaid-cli');
    console.log('If you cannot install it, please use the HTML viewer at docs/pics/flowchart/mermaid_renderer.html instead.');
    process.exit(1);
}

// Function to export a diagram to PNG
function exportDiagram(diagramPath, tempPath, outputPath, title) {
    try {
        // Read the diagram content
        const diagramContent = fs.readFileSync(diagramPath, 'utf8');
        
        // Write to temporary file
        fs.writeFileSync(tempPath, diagramContent, 'utf8');
        
        // Generate PNG using mermaid-cli
        console.log(`Generating ${title} PNG...`);
        execSync(`mmdc -i ${tempPath} -o ${outputPath} -w 1920 -H 1080`, { stdio: 'inherit' });
        
        console.log(`${title} exported to ${outputPath}`);
    } catch (error) {
        console.error(`Error exporting ${title}:`, error.message);
    }
}

// Export Documentation File Map
if (fs.existsSync(filesMapPath)) {
    exportDiagram(filesMapPath, tempFilesMapPath, outputFilesMapPath, 'Documentation File Map');
} else {
    console.error(`Documentation File Map not found at ${filesMapPath}`);
}

// Export Project Workflow
if (fs.existsSync(workflowPath)) {
    exportDiagram(workflowPath, tempWorkflowPath, outputWorkflowPath, 'Project Workflow');
} else {
    console.error(`Project Workflow not found at ${workflowPath}`);
}

// Clean up temporary files
try {
    if (fs.existsSync(tempFilesMapPath)) fs.unlinkSync(tempFilesMapPath);
    if (fs.existsSync(tempWorkflowPath)) fs.unlinkSync(tempWorkflowPath);
} catch (error) {
    console.error('Error cleaning up temporary files:', error.message);
}

console.log('Export complete!');
console.log('If you encountered any issues, try using the HTML viewer at docs/pics/flowchart/mermaid_renderer.html instead.'); 