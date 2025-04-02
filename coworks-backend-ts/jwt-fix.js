/**
 * JWT Fix Script
 * 
 * This script updates all API routes to use the JWT wrapper instead of importing directly from config/jwt.
 * This ensures consistent token verification across the application.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const API_ROUTES_DIR = path.join(__dirname, 'src', 'app', 'api');
const OLD_IMPORT = /import\s+\{\s*([^}]+)\s*\}\s+from\s+(['"])[^'"]*config\/jwt\2/g;
const WRAPPER_IMPORT = "import { $1 } from '@/utils/jwt-wrapper'";

// Scan all route files
function findRouteFiles(dir) {
  let results = [];
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Recursively search directories
      results = results.concat(findRouteFiles(filePath));
    } else if (file === 'route.ts' || file === 'route.js') {
      // Found a route file
      results.push(filePath);
    }
  }

  return results;
}

// Update imports in a file
function updateImports(filePath) {
  try {
    // Read the file
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;

    // Replace imports
    content = content.replace(OLD_IMPORT, WRAPPER_IMPORT);

    // Check if we need to add CORS headers
    if (!content.includes('corsHeaders')) {
      const corsHeadersCode = `
// Add CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
`;

      // Find the right place to add headers (after imports but before functions)
      const importEndIdx = content.lastIndexOf('import');
      if (importEndIdx !== -1) {
        const importBlockEnd = content.indexOf('\n\n', importEndIdx);
        if (importBlockEnd !== -1) {
          content = content.slice(0, importBlockEnd + 2) + corsHeadersCode + content.slice(importBlockEnd + 2);
        }
      }
    }

    // Check if we need to add OPTIONS handler
    if (!content.includes('OPTIONS(') && !content.includes('export async function OPTIONS')) {
      const optionsHandler = `
// OPTIONS handler for CORS
export async function OPTIONS(request) {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders
  });
}
`;
      content = content + optionsHandler;
    }

    // Add CORS headers to all response JSON
    content = content.replace(/NextResponse\.json\(\s*{/g, 'NextResponse.json(\n      {');
    content = content.replace(/}\s*\)\s*;/g, '}\n    , { headers: corsHeaders });');
    content = content.replace(/}\s*,\s*{\s*status:\s*(\d+)\s*}\s*\)\s*;/g, '}\n    , { status: $1, headers: corsHeaders });');

    // Save the file if changes were made
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`Error updating ${filePath}:`, error);
    return false;
  }
}

// Main function
function main() {
  console.log('🔍 Finding API route files...');
  const routeFiles = findRouteFiles(API_ROUTES_DIR);
  console.log(`Found ${routeFiles.length} route files.`);

  let updatedCount = 0;

  for (const filePath of routeFiles) {
    // Skip files that don't need updating
    if (!fs.readFileSync(filePath, 'utf8').includes('config/jwt')) {
      continue;
    }

    console.log(`🔧 Updating ${filePath}...`);
    const updated = updateImports(filePath);
    
    if (updated) {
      updatedCount++;
    }
  }

  console.log(`✅ Updated ${updatedCount} route files.`);
}

// Run the script
main(); 