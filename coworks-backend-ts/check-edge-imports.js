#!/usr/bin/env node

// This script checks for problematic Sequelize imports in files that
// might be used in Edge Runtime (middleware.ts, etc)

const fs = require('fs');
const path = require('path');

console.log('Checking for problematic imports in Edge Runtime files...');

// Files to check
const filesToCheck = [
  'src/middleware.ts',
  'src/utils/jwt.ts',
];

// Patterns to look for
const problematicPatterns = [
  'import.*from.*[\'\"]@/models[\'\"]',
  'import.*from.*[\'\"]sequelize[\'\"]',
  'import.*from.*[\'\"]@/config/database[\'\"]',
  'require\\([\'\"](sequelize|@/models|@/config/database)[\'\"]\\)'
];

// Compile regexes
const regexPatterns = problematicPatterns.map(pattern => new RegExp(pattern));

// Function to check a file for problematic imports
function checkFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.warn(`File not found: ${filePath}`);
      return false;
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    let hasProblems = false;
    
    // Check for problematic patterns
    regexPatterns.forEach((regex, index) => {
      if (regex.test(content)) {
        console.error(`❌ Found problematic import in ${filePath}: ${problematicPatterns[index]}`);
        hasProblems = true;
      }
    });
    
    // Check if the file has Edge runtime directive (which would be a problem)
    const hasEdgeRuntimeDirective = /export\s+const\s+runtime\s*=\s*["']edge["']/.test(content);
    if (hasEdgeRuntimeDirective) {
      console.error(`❌ Found Edge runtime directive in ${filePath}, which may cause issues with Sequelize imports`);
      hasProblems = true;
    }
    
    if (!hasProblems) {
      console.log(`✅ No problematic imports found in ${filePath}`);
    }
    
    return hasProblems;
  } catch (error) {
    console.error(`Error checking ${filePath}:`, error.message);
    return true;
  }
}

// Check all files
let hasAnyProblems = false;
filesToCheck.forEach(file => {
  const absolutePath = path.join(process.cwd(), file);
  if (checkFile(absolutePath)) {
    hasAnyProblems = true;
  }
});

// Find all route.ts files and check them
function findRouteFiles(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  let routeFiles = [];
  
  for (const file of files) {
    const filePath = path.join(dir, file.name);
    if (file.isDirectory()) {
      routeFiles = routeFiles.concat(findRouteFiles(filePath));
    } else if (file.name === 'route.ts' || file.name === 'route.tsx') {
      routeFiles.push(filePath);
    }
  }
  
  return routeFiles;
}

try {
  const apiDir = path.join(process.cwd(), 'src', 'app', 'api');
  if (fs.existsSync(apiDir)) {
    console.log('\nChecking API route files...');
    const routeFiles = findRouteFiles(apiDir);
    console.log(`Found ${routeFiles.length} route files`);
    
    routeFiles.forEach(file => {
      if (checkFile(file)) {
        hasAnyProblems = true;
      }
    });
  }
} catch (error) {
  console.error('Error checking API routes:', error.message);
  hasAnyProblems = true;
}

if (hasAnyProblems) {
  console.error('\n⚠️ Found problematic imports that could cause Edge Runtime errors.');
  console.error('Run `node fix-runtime.js` to fix the issues.');
  process.exit(1);
} else {
  console.log('\n✅ All files checked, no problematic imports found!');
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