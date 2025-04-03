#!/usr/bin/env node

/**
 * Package.json Fix Script
 * 
 * This script ensures the package.json file has the correct settings for deployment
 */

const fs = require('fs');
const path = require('path');

console.log('Reading package.json...');

try {
  // Read the current package.json
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  console.log('Updating package.json...');
  
  // Ensure engines field specifies Node.js 18.x
  pkg.engines = pkg.engines || {};
  pkg.engines.node = '18.x';
  
  // Update scripts to include essential commands
  pkg.scripts = {
    ...pkg.scripts,
    'dev': 'next dev',
    'build': 'next build',
    'vercel-build': 'next build',
    'start': 'next start',
    'lint': 'next lint'
  };
  
  // Remove any conflicting settings
  delete pkg.scripts.prebuild;
  
  // Write the updated package.json file
  fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
  
  console.log('package.json updated successfully!');
} catch (error) {
  console.error('Error updating package.json:', error.message);
  process.exit(1);
} 