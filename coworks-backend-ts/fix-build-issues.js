#!/usr/bin/env node

/**
 * Fix Build Issues Script
 * 
 * This script is a comprehensive solution for fixing common Vercel deployment issues
 * by running all the fix scripts in the correct order and reporting any remaining issues.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bold: '\x1b[1m'
};

// Helper function to run a command and return its output
function runCommand(command) {
  try {
    const output = execSync(command, { encoding: 'utf8' });
    return { success: true, output };
  } catch (error) {
    return { 
      success: false, 
      output: error.stdout || '', 
      error: error.stderr || error.message 
    };
  }
}

// Helper function to check if a file exists
function fileExists(filePath) {
  return fs.existsSync(filePath);
}

// Log with color
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Main function
async function main() {
  log('🛠️  Starting comprehensive build issue fixes...', 'bold');
  log('This script will run all fix scripts to prepare your app for deployment\n', 'blue');
  
  const scripts = [
    { 
      name: 'Check Node.js Version', 
      command: 'node check-node-version.js',
      file: 'check-node-version.js',
      description: 'Verifies Node.js version compatibility'
    },
    { 
      name: 'Check Edge Imports', 
      command: 'node check-edge-imports.js',
      file: 'check-edge-imports.js',
      description: 'Checks for problematic imports in Edge Runtime files'
    },
    { 
      name: 'Fix Runtime Issues', 
      command: 'node fix-runtime.js',
      file: 'fix-runtime.js',
      description: 'Adds Node.js runtime directives to API routes'
    },
    { 
      name: 'Fix JWT Exports', 
      command: 'node fix-jwt-exports.js',
      file: 'fix-jwt-exports.js',
      description: 'Fixes JWT utility imports in route files'
    },
    { 
      name: 'Fix Dynamic Server Issues', 
      command: 'node fix-dynamic-server.js',
      file: 'fix-dynamic-server.js',
      description: 'Resolves dynamic server usage errors in API routes'
    },
    { 
      name: 'Fix Problematic Routes', 
      command: 'node fix-problematic-routes.js',
      file: 'fix-problematic-routes.js',
      description: 'Specifically fixes routes that cause dynamic server usage errors'
    },
    { 
      name: 'Fix Babel Dependencies', 
      command: 'node fix-babel.js',
      file: 'fix-babel.js',
      description: 'Fixes Babel dependencies (if script exists)'
    },
    { 
      name: 'Fix Font Imports', 
      command: 'node fix-fonts.js',
      file: 'fix-fonts.js',
      description: 'Fixes font import issues (if script exists)'
    }
  ];
  
  // Track script execution results
  const results = [];
  
  // Execute each script
  for (const script of scripts) {
    if (!fileExists(script.file)) {
      log(`⚠️  ${script.name}: Script file not found, skipping...`, 'yellow');
      results.push({ name: script.name, status: 'skipped', reason: 'File not found' });
      continue;
    }
    
    log(`\n🔄 Running: ${script.name}`, 'cyan');
    log(`Description: ${script.description}`, 'blue');
    
    const result = runCommand(script.command);
    
    if (result.success) {
      log(`✅ ${script.name}: Completed successfully`, 'green');
      console.log(result.output);
      results.push({ name: script.name, status: 'success' });
    } else {
      log(`❌ ${script.name}: Failed`, 'red');
      console.log(result.output);
      if (result.error) console.error(result.error);
      results.push({ name: script.name, status: 'failed', error: result.error });
    }
  }
  
  // Summary
  log('\n📋 Execution Summary:', 'bold');
  log('----------------------------------------------------------------', 'white');
  let allSuccess = true;
  
  for (const result of results) {
    const statusColor = result.status === 'success' ? 'green' : 
                        result.status === 'skipped' ? 'yellow' : 'red';
    log(`${result.name}: ${result.status}`, statusColor);
    
    if (result.status === 'failed') {
      allSuccess = false;
    }
  }
  
  log('----------------------------------------------------------------', 'white');
  
  if (allSuccess) {
    log('\n✅ All executed scripts completed successfully!', 'green');
    log('Your application should now be ready for deployment to Vercel.', 'green');
  } else {
    log('\n⚠️  Some scripts failed or were skipped.', 'yellow');
    log('Check the error messages above and try to fix the issues manually.', 'yellow');
  }
  
  log('\nRecommended Next Steps:', 'bold');
  log('1. Commit your changes', 'white');
  log('2. Run "npm run build" to test building locally', 'white');
  log('3. Deploy to Vercel', 'white');
}

main().catch(error => {
  log(`\n❌ Error running fix scripts: ${error.message}`, 'red');
  process.exit(1);
}); 