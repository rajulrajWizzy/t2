#!/usr/bin/env node

// This script checks if the Node.js version matches the version in package.json
// Run it before building to ensure compatibility

const fs = require('fs');
const path = require('path');

console.log('Checking Node.js version compatibility...');

// Get current Node.js version
const currentNodeVersion = process.version;
console.log(`Current Node.js version: ${currentNodeVersion}`);

// Read package.json for the required Node.js version
try {
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  if (packageJson.engines && packageJson.engines.node) {
    console.log(`Required Node.js version in package.json: ${packageJson.engines.node}`);
    
    // Simple version check
    const requiredVersion = packageJson.engines.node;
    
    // Check if current version satisfies the requirement
    // This is a simple check that works for our case with "18.x"
    if (requiredVersion.startsWith('18') && !currentNodeVersion.startsWith('v18')) {
      console.error('ERROR: Node.js version mismatch!');
      console.error(`This project requires Node.js ${requiredVersion}, but you're using ${currentNodeVersion}`);
      console.error('Please use the correct Node.js version or update package.json to match your current version.');
      
      // Create/update .nvmrc file to help developers use the right version
      const nvmrcPath = path.join(process.cwd(), '.nvmrc');
      fs.writeFileSync(nvmrcPath, '18\n');
      console.log('Created/updated .nvmrc file with version 18');
      
      // Exit with error code
      process.exit(1);
    } else {
      console.log('✅ Node.js version compatible!');
    }
  } else {
    console.warn('No Node.js version specified in package.json engines field');
    
    // Add engines field to package.json if not present
    packageJson.engines = packageJson.engines || {};
    packageJson.engines.node = '18.x';
    
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log('Added Node.js version 18.x to package.json engines field');
    
    // Create/update .nvmrc file
    const nvmrcPath = path.join(process.cwd(), '.nvmrc');
    fs.writeFileSync(nvmrcPath, '18\n');
    console.log('Created/updated .nvmrc file with version 18');
  }
} catch (error) {
  console.error('Error reading package.json:', error.message);
  process.exit(1);
}

// Check .nvmrc file
try {
  const nvmrcPath = path.join(process.cwd(), '.nvmrc');
  if (!fs.existsSync(nvmrcPath)) {
    fs.writeFileSync(nvmrcPath, '18\n');
    console.log('Created .nvmrc file with version 18');
  } else {
    const nvmrcContent = fs.readFileSync(nvmrcPath, 'utf8').trim();
    console.log(`Current .nvmrc version: ${nvmrcContent}`);
    if (nvmrcContent !== '18') {
      fs.writeFileSync(nvmrcPath, '18\n');
      console.log('Updated .nvmrc file to version 18');
    }
  }
} catch (error) {
  console.error('Error handling .nvmrc file:', error.message);
}

console.log('Node.js version check complete'); 