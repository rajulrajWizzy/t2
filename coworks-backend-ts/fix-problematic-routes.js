#!/usr/bin/env node

/**
 * Fix Problematic Routes Script
 * 
 * This script specifically targets the routes mentioned in the error logs
 * and ensures they have all the necessary directives to prevent
 * "Dynamic server usage" errors during build.
 */

const fs = require('fs');
const path = require('path');

console.log('\x1b[33m%s\x1b[0m', '🔧 Fixing problematic routes with dynamic server usage errors...');

// Routes that have specific issues (from error logs)
const PROBLEMATIC_ROUTES = [
  'admin/dashboard/stats',
  'admin/profile',
  'admin/super/stats',
  'admin/support/tickets',
  'admin/users',
  'branches/stats',
  'slots/available',
  'slots/branch-seating',
  'slots/categorized',
  'slots/seating-type'
];

// Process a file to add the runtime directive
function processFile(filePath) {
  try {
    console.log(`Processing ${filePath}`);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // More aggressive approach to remove all directives and their comments
    // This handles cases where there are multiple instances
    content = content.replace(/\/\/.*?runtime.*?\n/g, '');
    content = content.replace(/\/\/.*?Node\.js.*?\n/g, '');
    content = content.replace(/\/\/.*?dynamic.*?\n/g, '');
    content = content.replace(/\/\/.*?Explicitly.*?\n/g, '');
    content = content.replace(/export const runtime.*?\n/g, '');
    content = content.replace(/export const dynamic.*?\n/g, '');
    content = content.replace(/export const fetchCache.*?\n/g, '');
    
    // Clean up any blank lines at the top of the file
    while (content.startsWith('\n')) {
      content = content.substring(1);
    }
    
    // Add fresh comment and directives at the top of the file
    const directives = '// Explicitly set Node.js runtime for this route\nexport const runtime = "nodejs";\nexport const dynamic = "force-dynamic";\nexport const fetchCache = "force-no-store";\n\n';
    
    // Add directives at the top of the file
    content = directives + content;
    
    // Write back to the file
    fs.writeFileSync(filePath, content);
    
    console.log(`✅ Updated directives in ${filePath}`);
    return true;
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error);
    return false;
  }
}

// Recursively find route files that match problematic patterns
function findProblematicRoutes(dir, problematicFiles = []) {
  try {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const file of files) {
      const filePath = path.join(dir, file.name);
      
      if (file.isDirectory()) {
        findProblematicRoutes(filePath, problematicFiles);
      } else if (file.name === 'route.ts' || file.name === 'route.tsx') {
        // Check if this route matches any problematic route pattern
        const relativePath = path.relative(path.join('src', 'app', 'api'), dir).replace(/\\/g, '/');
        
        if (PROBLEMATIC_ROUTES.some(route => relativePath.includes(route))) {
          problematicFiles.push(filePath);
        }
      }
    }
    
    return problematicFiles;
  } catch (error) {
    console.error(`Error scanning directory ${dir}:`, error);
    return problematicFiles;
  }
}

// Create the API config file to ensure all routes are dynamic
function createApiConfig() {
  try {
    const configPath = path.join('src', 'app', 'api', 'config.js');
    
    // Create directory if it doesn't exist
    const dir = path.join('src', 'app', 'api');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    const configContent = `/**
 * API Routes Configuration
 * 
 * This file ensures all API routes use the Node.js runtime
 * and are always dynamically rendered.
 */

// Force all API routes to use Node.js runtime
export const runtime = 'nodejs';

// Force all API routes to be dynamic
export const dynamic = 'force-dynamic';

// Prevent static generation
export const fetchCache = 'force-no-store';
`;

    fs.writeFileSync(configPath, configContent);
    console.log(`✅ Created API config file at ${configPath}`);
    return true;
  } catch (error) {
    console.error('Error creating API config:', error);
    return false;
  }
}

// Main execution
try {
  // Create common config for API routes
  createApiConfig();
  
  // Find all problematic route files
  const apiDir = path.join('src', 'app', 'api');
  
  if (!fs.existsSync(apiDir)) {
    console.error('❌ API directory not found:', apiDir);
    process.exit(1);
  }
  
  const problematicFiles = findProblematicRoutes(apiDir);
  console.log(`🔍 Found ${problematicFiles.length} problematic route files`);
  
  if (problematicFiles.length === 0) {
    console.log('⚠️ No problematic route files found. Check your directory structure.');
    process.exit(0);
  }
  
  let modifiedCount = 0;
  for (const filePath of problematicFiles) {
    if (processFile(filePath)) {
      modifiedCount++;
    }
  }
  
  console.log(`✅ Modified ${modifiedCount} problematic route files`);
  console.log('\n✅ Problematic routes fixed successfully!');
} catch (error) {
  console.error('❌ Error during fix:', error.message);
  process.exit(1);
} 