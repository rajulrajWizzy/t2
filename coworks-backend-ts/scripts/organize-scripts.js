/**
 * Script Organization and Documentation Generator
 * 
 * This script categorizes all scripts in the scripts directory
 * and creates a comprehensive documentation file (SCRIPTS.md).
 * 
 * The script performs the following tasks:
 * 1. Scans all .js files in the scripts directory
 * 2. Categorizes them based on naming patterns into:
 *    - Migration Scripts: Scripts that modify database schema
 *    - Seeding Scripts: Scripts that add initial or test data
 *    - Utility Scripts: Helper scripts for various tasks
 *    - Deployment Scripts: Scripts used during deployment
 *    - Admin Management Scripts: For managing admin users
 *    - Other Scripts: Any scripts not fitting other categories
 * 3. Extracts description from file comments where available
 * 4. Generates a markdown document with all scripts organized by category
 * 5. Includes metadata like file size and last modified date
 * 
 * Usage:
 *   node scripts/organize-scripts.js
 *   or
 *   npm run docs:scripts
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

// Helper function for logging
function log(message, color = colors.reset) {
  console.log(`${color}[organize-scripts] ${message}${colors.reset}`);
}

// Define script categories
const scriptCategories = {
  migrations: {
    title: 'Migration Scripts',
    description: 'Scripts that modify the database schema or structure',
    filePattern: /^migrate/i
  },
  seeding: {
    title: 'Seeding Scripts',
    description: 'Scripts that add initial or test data to the database',
    filePattern: /^seed|^add|smart-seed/i
  },
  utilities: {
    title: 'Utility Scripts',
    description: 'Helper scripts for various tasks like creating directories, testing, etc.',
    filePattern: /^create|^test|direct-/i
  },
  deployment: {
    title: 'Deployment Scripts',
    description: 'Scripts used during deployment on platforms like Vercel',
    filePattern: /^vercel|deploy/i
  },
  admin: {
    title: 'Admin Management Scripts',
    description: 'Scripts for managing admin users and their permissions',
    filePattern: /admin-manager|admin.*table/i
  },
  other: {
    title: 'Other Scripts',
    description: 'Scripts that don\'t fit into any other category',
    filePattern: null // This will catch anything not matched by other patterns
  }
};

// Function to read first few lines of a file to extract description
function getFileDescription(filePath, maxLines = 20) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n').slice(0, maxLines);
    
    // Look for comments that describe the file
    const descriptionLines = lines.filter(line => 
      line.trim().startsWith('//') || 
      line.trim().startsWith('*') || 
      line.trim().startsWith('/*')
    );
    
    if (descriptionLines.length > 0) {
      // Clean up the comment markers
      return descriptionLines
        .map(line => line.trim().replace(/^\/\/\s*|^\*\s*|^\/\*\s*|\s*\*\/$/g, ''))
        .filter(line => line.length > 0)
        .join(' ');
    }
    
    // If no description found, return null
    return null;
  } catch (error) {
    return null;
  }
}

// Function to get file size in a readable format
function getFileSize(filePath) {
  const stats = fs.statSync(filePath);
  const fileSizeInBytes = stats.size;
  
  if (fileSizeInBytes < 1024) {
    return `${fileSizeInBytes} bytes`;
  } else if (fileSizeInBytes < 1024 * 1024) {
    return `${(fileSizeInBytes / 1024).toFixed(1)} KB`;
  } else {
    return `${(fileSizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}

// Function to categorize scripts
function categorizeScripts() {
  const scriptsDir = path.join(__dirname);
  const files = fs.readdirSync(scriptsDir)
    .filter(file => file.endsWith('.js') && file !== 'organize-scripts.js');
  
  // Initialize categories
  const categorizedFiles = {};
  Object.keys(scriptCategories).forEach(category => {
    categorizedFiles[category] = [];
  });
  
  // Categorize each file
  files.forEach(file => {
    const filePath = path.join(scriptsDir, file);
    const fileDescription = getFileDescription(filePath) || 'No description found';
    const fileSize = getFileSize(filePath);
    const fileStats = fs.statSync(filePath);
    const lastModified = fileStats.mtime.toISOString().split('T')[0];
    
    const fileInfo = {
      name: file,
      path: filePath,
      description: fileDescription,
      size: fileSize,
      lastModified: lastModified
    };
    
    // Determine which category the file belongs to
    let isFileCategorized = false;
    for (const [category, { filePattern }] of Object.entries(scriptCategories)) {
      if (category === 'other') continue; // Skip 'other' for now
      
      if (filePattern && filePattern.test(file)) {
        categorizedFiles[category].push(fileInfo);
        isFileCategorized = true;
        break;
      }
    }
    
    // If not categorized, put in 'other'
    if (!isFileCategorized) {
      categorizedFiles.other.push(fileInfo);
    }
  });
  
  return categorizedFiles;
}

// Function to generate markdown documentation
function generateMarkdown(categorizedFiles) {
  let markdown = '# Scripts Documentation\n\n';
  markdown += 'This document provides an overview of all scripts in the project, categorized by their purpose.\n\n';
  markdown += 'Table of Contents:\n';
  
  // Add table of contents
  Object.keys(scriptCategories).forEach(category => {
    if (categorizedFiles[category].length > 0) {
      markdown += `- [${scriptCategories[category].title}](#${scriptCategories[category].title.toLowerCase().replace(/\s+/g, '-')})\n`;
    }
  });
  
  markdown += '\n';
  
  // Add details for each category
  Object.keys(scriptCategories).forEach(category => {
    if (categorizedFiles[category].length === 0) return;
    
    markdown += `## ${scriptCategories[category].title}\n\n`;
    markdown += `${scriptCategories[category].description}\n\n`;
    
    // Add table of scripts
    markdown += '| Script | Description | Size | Last Modified |\n';
    markdown += '|--------|-------------|------|---------------|\n';
    
    categorizedFiles[category].forEach(file => {
      markdown += `| ${file.name} | ${file.description} | ${file.size} | ${file.lastModified} |\n`;
    });
    
    markdown += '\n';
  });
  
  return markdown;
}

// Main function
async function main() {
  try {
    log('Categorizing scripts...', colors.cyan);
    const categorizedFiles = categorizeScripts();
    
    log('Generating markdown documentation...', colors.cyan);
    const markdown = generateMarkdown(categorizedFiles);
    
    // Write to file
    const outputPath = path.join(__dirname, '..', 'SCRIPTS.md');
    fs.writeFileSync(outputPath, markdown);
    
    log(`Documentation generated successfully: ${outputPath}`, colors.green);
    
    // Print summary
    log('Script Summary:', colors.bright);
    Object.keys(scriptCategories).forEach(category => {
      if (categorizedFiles[category].length > 0) {
        log(`  - ${scriptCategories[category].title}: ${categorizedFiles[category].length} scripts`, colors.yellow);
      }
    });
  } catch (error) {
    log(`Error: ${error.message}`, colors.red);
    console.error(error);
    process.exit(1);
  }
}

// Run the main function
main(); 