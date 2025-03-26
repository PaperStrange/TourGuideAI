# TourGuideAI Project Diagrams

This file provides information about the Mermaid diagrams used in the TourGuideAI project. These diagrams help developers understand the project structure, documentation relationships, and development workflow.

## Overview

The project uses two key Mermaid diagrams:

1. **Documentation File Map** (`.mermaidfilesmap`) - Visualizes how documentation files are connected throughout the project
2. **Project Workflow** (`.mermaidworkflow`) - Illustrates the standard project development phases and workflow

These diagrams help with:
- Understanding documentation dependencies and workflow
- Ensuring consistent processes across the project
- Finding related documentation quickly
- Visualizing the complete development lifecycle

## How to View the Diagrams

You can view the diagrams using any of these methods:

1. **HTML Viewer** (Recommended):
   - Open `docs/pics/flowchart/mermaid_renderer.html` in any browser
   - Toggle between diagrams using the buttons
   - Take screenshots to save as PNGs

2. **Export Script**:
   - Use `docs/pics/flowchart/export_diagrams.js` (Node.js)
   - These will generate PNG files in the docs/pics/flowchart directory

3. **Mermaid Live Editor**:
   - Copy the diagram content and paste into [Mermaid Live Editor](https://mermaid-js.github.io/mermaid-live-editor/)

4. **VS Code with Mermaid Extension**:
   - Install a Mermaid preview extension for VS Code
   - Open `.mermaidfilesmap` or `.mermaidworkflow` files

## Documentation File Map

### Structure

The documentation map is organized into these sections:

- **Root Documentation**: Main project documents like README.md, ARCHITECTURE.md
- **Project Lifecycle**: Documents categorized by project development stages
  - Process Monitors
  - Version Control
  - Code & Project Structure
  - Knowledge Base
  - Testing
  - Deployment
  - Performance Optimization
- **Feature Documentation**: Documentation specific to features and components

### Color Coding

The nodes in the documentation map are color-coded for easier identification:

- **Gray**: Root documentation files
- **Green**: Documentation inventory
- **Blue**: Project management and process files
- **Yellow**: Reference files
- **Red**: Testing-related files
- **Light Blue**: Project lifecycle files

## Project Workflow Diagram

### Structure

The workflow diagram visualizes the standard phases of our development process:

1. **Initialization**: Project setup and requirements gathering
2. **Development**: Feature implementation and task tracking
3. **Verification**: Testing and validation of completed work
4. **Documentation**: Code review and documentation updates
5. **Artifacts**: Updating project artifacts
6. **Knowledge**: Capturing lessons learned
7. **Final Review**: Project phase completion

### Color Coding

The workflow diagram uses these colors:
- **Blue**: Initialization phase
- **Green**: Development phase
- **Purple**: Verification phase
- **Orange**: Documentation phase
- **Red**: Artifacts phase
- **Teal**: Knowledge phase
- **Gold**: Final review phase

## Updating the Diagrams

When making changes to project structure or workflows:

1. **Documentation Map**:
   - Edit the `docs/pics/flowchart/.mermaidfilesmap` file
   - Add new nodes for new documents
   - Update relationships between documents
   - Maintain the subgraph structure and color coding

2. **Project Workflow**:
   - Edit the `docs/pics/flowchart/.mermaidworkflow` file
   - Update phases or tasks as processes change
   - Maintain color coding and connections

## Integration with Project Processes

These diagrams should be consulted when:
- Creating new documentation
- Reorganizing project structure
- Onboarding new team members
- Planning process improvements
- Training team members on development practices

## Exporting to PNG

To save the diagrams as PNG files:

1. Navigate to the `docs/pics/flowchart` directory
2. Run the Node.js script: `node export_diagrams.js`
3. Or use the HTML viewer at `docs/pics/flowchart/mermaid_renderer.html` and take screenshots

The exported files will be saved as:
- `docs/pics/flowchart/project_documentation_map.png`
- `docs/pics/flowchart/project_workflow.png` 