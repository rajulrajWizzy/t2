#!/usr/bin/env node

/**
 * Check Edge Runtime Imports
 * 
 * This script checks for problematic imports in files that might be used in Edge Runtime:
 * 1. Middleware
 * 2. JWT utilities
 * 3. API routes without Node.js runtime
 */

const fs = require('fs');
const path = require('path');

console.log('Checking for problematic imports in Edge Runtime files...');

// Problematic imports to check for
const problematicImports = [
  /import.*from.*['"]@\/models['"]/,
  /import.*from.*['"]sequelize['"]/,
  /import.*from.*['"]@\/config\/database['"]/
];

// Check specific files that must be Edge-compatible
const edgeFiles = [
  path.join('src', 'middleware.ts'),
  path.join('src', 'utils', 'jwt.ts')
];

let hasProblems = false;

// Check specific files known to be used in Edge Runtime
for (const filePath of edgeFiles) {
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    let fileHasProblems = false;
    
    // Check if file explicitly sets Node.js runtime
    const hasNodeRuntime = content.includes('export const runtime = ') && content.includes('nodejs');
    
    // Skip further checks if the file explicitly sets Node.js runtime
    if (hasNodeRuntime) {
      console.log(`✅ No problematic imports found in ${path.resolve(filePath)}`);
      continue;
    }
    
    // Check for problematic imports
    for (const pattern of problematicImports) {
      if (pattern.test(content)) {
        console.log(`❌ Found problematic import in ${path.resolve(filePath)}: ${pattern}`);
        fileHasProblems = true;
        hasProblems = true;
      }
    }
    
    if (!fileHasProblems) {
      console.log(`✅ No problematic imports found in ${path.resolve(filePath)}`);
    }
  }
}

// Check API route files
console.log('Checking API route files...');
const apiDir = path.join('src', 'app', 'api');

if (fs.existsSync(apiDir)) {
  const routeFiles = findRouteFiles(apiDir);
  console.log(`Found ${routeFiles.length} route files`);
  
  for (const routeFile of routeFiles) {
    const content = fs.readFileSync(routeFile, 'utf8');
    let fileHasProblems = false;
    
    // Check if file explicitly sets Node.js runtime
    const hasNodeRuntime = content.includes('export const runtime = ') && content.includes('nodejs');
    
    // Check for Edge runtime directive which would be problematic with Sequelize
    const hasEdgeRuntime = content.includes('export const runtime = ') && content.includes('edge');
    
    if (hasEdgeRuntime) {
      console.log(`❌ File ${routeFile} has Edge runtime but may use Sequelize - this will cause errors!`);
      fileHasProblems = true;
      hasProblems = true;
    }
    
    // If the file has Node.js runtime, it's safe to use Sequelize
    if (hasNodeRuntime) {
      console.log(`✅ File ${routeFile} has Node.js runtime - safe to use Sequelize`);
      continue;
    }
    
    // If no runtime is specified, check for problematic imports
    for (const pattern of problematicImports) {
      if (pattern.test(content)) {
        console.log(`❌ Found problematic import in ${routeFile}: ${pattern} without Node.js runtime directive`);
        fileHasProblems = true;
        hasProblems = true;
      }
    }
    
    if (!fileHasProblems) {
      console.log(`✅ No problematic imports found in ${routeFile}`);
    }
  }
} else {
  console.log('API directory not found');
}

// Find all route files in a directory
function findRouteFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // Recursively search directories
      results = results.concat(findRouteFiles(filePath));
    } else if (file === 'route.ts' || file === 'route.tsx') {
      results.push(filePath);
    }
  }
  
  return results;
}

if (hasProblems) {
  console.log('\n⚠️ Found potentially problematic imports that could cause Edge Runtime errors.');
  console.log('Run `node fix-runtime.js` to fix these issues by setting Node.js runtime for all API routes.');
  process.exit(1);
} else {
  console.log('✅ No problematic imports found that would cause Edge Runtime errors.');
  process.exit(0);
}

// Check next.config.js
try {
  const nextConfigPath = path.join(process.cwd(), 'next.config.js');
  if (fs.existsSync(nextConfigPath)) {
    const content = fs.readFileSync(nextConfigPath, 'utf8');
    
    // Check for serverComponentsExternalPackages setting
    if (!content.includes('serverComponentsExternalPackages')) {
      console.error('\n⚠️ next.config.js does not have serverComponentsExternalPackages setting, which is needed for Sequelize compatibility.');
      hasAnyProblems = true;
    } else if (!content.includes('sequelize') || !content.includes('pg')) {
      console.error('\n⚠️ next.config.js has serverComponentsExternalPackages but may be missing necessary packages (sequelize, pg).');
      hasAnyProblems = true;
    } else {
      console.log('\n✅ next.config.js has correct serverComponentsExternalPackages settings.');
    }
  }
} catch (error) {
  console.error('Error checking next.config.js:', error.message);
}

process.exit(hasAnyProblems ? 1 : 0); 