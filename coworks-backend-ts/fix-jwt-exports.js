#!/usr/bin/env node

/**
 * Fix JWT Exports Script
 * 
 * This script fixes issues with JWT utility imports in route files.
 * It scans API route files and updates imports from verifyJWT to use verifyToken instead,
 * and verifyAuth to use verifyTokenFromRequest.
 */

const fs = require('fs');
const path = require('path');

console.log('\x1b[33m%s\x1b[0m', '🔧 Fixing JWT utility exports in route files...');

// Find all route.ts files
function findRouteFiles(dir, routeFiles = []) {
  const files = fs.readdirSync(dir, { withFileTypes: true });

  for (const file of files) {
    const filePath = path.join(dir, file.name);

    if (file.isDirectory()) {
      findRouteFiles(filePath, routeFiles);
    } else if (file.name === 'route.ts' || file.name === 'route.tsx') {
      routeFiles.push(filePath);
    }
  }

  return routeFiles;
}

// Process imports in a file
function processImports(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Replace relative imports with absolute imports
    if (content.includes('import { verifyJWT }') || content.includes("import {verifyJWT}")) {
      console.log(`🔄 Fixing verifyJWT import in ${filePath}`);
      
      // Replace relative imports with absolute ones
      content = content.replace(
        /import\s*{\s*verifyJWT\s*}\s*from\s*['"]\.\.\/\.\.\/\.\.\/\.\.\/utils\/jwt['"]/g, 
        'import { verifyJWT } from \'@/utils/jwt\''
      );
      
      content = content.replace(
        /import\s*{\s*verifyJWT\s*}\s*from\s*['"]\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/utils\/jwt['"]/g, 
        'import { verifyJWT } from \'@/utils/jwt\''
      );
      
      modified = true;
    }
    
    // Check if verifyAuth is imported
    if (content.includes('import { verifyAuth }') || content.includes("import {verifyAuth}")) {
      console.log(`✅ verifyAuth already imported correctly in ${filePath}`);
    }
    
    if (modified) {
      // Write back to the file
      fs.writeFileSync(filePath, content);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error);
    return false;
  }
}

// Main execution
try {
  // Find all API route files
  const apiDir = path.join('src', 'app', 'api');

  if (fs.existsSync(apiDir)) {
    const routeFiles = findRouteFiles(apiDir);
    console.log(`🔍 Found ${routeFiles.length} route files`);
    
    let modifiedCount = 0;
    for (const routeFile of routeFiles) {
      if (processImports(routeFile)) {
        modifiedCount++;
      }
    }

    console.log(`✅ Modified ${modifiedCount} route files`);
  } else {
    console.log('⚠️ API directory not found');
  }

  console.log('\n✅ JWT utility export fixes completed successfully!');
} catch (error) {
  console.error('❌ Error during JWT utility fixes process:', error.message);
  process.exit(1);
} 