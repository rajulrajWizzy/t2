#!/usr/bin/env node

/**
 * Check Node.js Version Script
 * 
 * This script checks if the current Node.js version is compatible with the version
 * specified in package.json engines field.
 */

const fs = require('fs');
const path = require('path');

function checkNodeVersion() {
  console.log('Checking Node.js version compatibility...');
  
  // Read package.json
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  const currentVersion = process.version; // e.g., 'v18.12.1'
  const requiredVersion = packageJson.engines?.node; // e.g., '18.x'
  
  console.log(`Current Node.js version: ${currentVersion}`);
  console.log(`Required Node.js version in package.json: ${requiredVersion}`);
  
  if (!requiredVersion) {
    console.log('No Node.js version requirement found in package.json');
    return true;
  }
  
  // Check if we're in a production environment (Vercel, etc.)
  const isProduction = process.env.NODE_ENV === 'production' || 
                      process.env.VERCEL === '1' || 
                      process.env.VERCEL_ENV === 'production';
  
  // Parse versions for comparison
  const current = currentVersion.replace('v', '').split('.')[0]; // Major version only
  let required = requiredVersion.replace(/[^\d.]/g, '').split('.')[0]; // Convert 18.x to 18
  
  // Special case for Node.js version matching
  if (requiredVersion.includes('x') || requiredVersion.includes('*')) {
    // For patterns like 18.x or 18.* - we only check the major version
    if (current === required) {
      console.log(`✅ Node.js version ${currentVersion} is compatible with required ${requiredVersion}`);
      createNvmrcFile(requiredVersion.split('.')[0]);
      return true;
    } else {
      if (isProduction) {
        console.error(`ERROR: Node.js version mismatch!`);
        console.error(`This project requires Node.js ${requiredVersion}, but you're using ${currentVersion}`);
        console.error(`Please use the correct Node.js version or update package.json to match your current version.`);
        createNvmrcFile(requiredVersion.split('.')[0]);
        process.exit(1);
      } else {
        console.warn(`⚠️ WARNING: You're using Node.js ${currentVersion} but the project requires ${requiredVersion}`);
        console.warn(`This might cause compatibility issues in production.`);
        createNvmrcFile(requiredVersion.split('.')[0]);
        return true;
      }
    }
  } else {
    // Handle exact version requirements or ranges (simplified)
    if (current === required) {
      console.log(`✅ Node.js version ${currentVersion} matches required ${requiredVersion}`);
      createNvmrcFile(requiredVersion);
      return true;
    } else {
      if (isProduction) {
        console.error(`ERROR: Node.js version mismatch!`);
        console.error(`This project requires Node.js ${requiredVersion}, but you're using ${currentVersion}`);
        console.error(`Please use the correct Node.js version or update package.json to match your current version.`);
        createNvmrcFile(requiredVersion);
        process.exit(1);
      } else {
        console.warn(`⚠️ WARNING: You're using Node.js ${currentVersion} but the project requires ${requiredVersion}`);
        console.warn(`This might cause compatibility issues in production.`);
        createNvmrcFile(requiredVersion);
        return true;
      }
    }
  }
}

function createNvmrcFile(version) {
  // Create .nvmrc file for nvm users
  const nvmrcPath = path.join(process.cwd(), '.nvmrc');
  fs.writeFileSync(nvmrcPath, version);
  console.log(`Created/updated .nvmrc file with version ${version}`);
}

// Run the check
try {
  checkNodeVersion();
} catch (error) {
  console.error('Error checking Node.js version:', error);
  process.exit(1);
} 