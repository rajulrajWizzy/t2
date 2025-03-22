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
    
    // Check if file already has all necessary directives
    const hasRuntime = content.includes('export const runtime = "nodejs"') || 
                     content.includes("export const runtime = 'nodejs'");
                     
    const hasDynamic = content.includes('export const dynamic = "force-dynamic"') || 
                     content.includes("export const dynamic = 'force-dynamic'");
                     
    const hasNoCache = content.includes('export const fetchCache = "force-no-store"') || 
                     content.includes("export const fetchCache = 'force-no-store'");
    
    // Remove any existing directives we might be replacing
    if (content.includes('export const runtime')) {
      content = content.replace(/export const runtime.*?\n/g, '');
    }
    
    if (content.includes('export const dynamic')) {
      content = content.replace(/export const dynamic.*?\n/g, '');
    }
    
    if (content.includes('export const fetchCache')) {
      content = content.replace(/export const fetchCache.*?\n/g, '');
    }
    
    // Add all necessary directives at the top of the file
    let directives = '';
    
    // Add comment if not already present
    if (!content.includes('// Explicitly set Node.js runtime')) {
      directives += '// Explicitly set Node.js runtime for this route\n';
    }
    
    directives += 'export const runtime = "nodejs";\n';
    directives += 'export const dynamic = "force-dynamic";\n';
    directives += 'export const fetchCache = "force-no-store";\n\n';
    
    // Check if there are any imports or other content at the top
    const firstImportIndex = content.indexOf('import ');
    
    if (firstImportIndex > 0) {
      // Insert directives before the first import
      content = content.substring(0, firstImportIndex) + directives + content.substring(firstImportIndex);
    } else {
      // No imports, just add at the top
      content = directives + content;
    }
    
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