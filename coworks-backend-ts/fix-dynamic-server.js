#!/usr/bin/env node

/**
 * Fix Dynamic Server Usage Script
 * 
 * This script addresses common "Dynamic server usage" errors in Next.js when deploying to Vercel.
 * It adds explicit runtime directives to API routes that use dynamic features like request.headers
 * or request.url, preventing build-time static rendering attempts.
 */

const fs = require('fs');
const path = require('path');

console.log('\x1b[33m%s\x1b[0m', '🔧 Fixing Dynamic Server Usage errors in API routes...');

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

// Common patterns that cause dynamic server usage errors
const DYNAMIC_PATTERNS = [
  'request.headers',
  'request.url',
  'req.headers',
  'req.url',
  'headers.get',
  'searchParams',
  'new URL(',
  'NextRequest',
  'createContext',
  'redirect(',
  'cookies'
];

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
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Force processing for problematic routes identified in error logs
    const isProblematicRoute = PROBLEMATIC_ROUTES.some(route => filePath.includes(route));
    
    // Check if the file has dynamic usage patterns
    const hasDynamicUsage = DYNAMIC_PATTERNS.some(pattern => content.includes(pattern));
    
    if (!hasDynamicUsage && !isProblematicRoute) {
      // If it's not a problematic route and doesn't have dynamic patterns, still add runtime
      // but don't report as "found dynamic usage"
      if (content.includes('export const runtime = "nodejs"') || 
          content.includes("export const runtime = 'nodejs'")) {
        return false;
      }
    } else {
      console.log(`🔍 Found ${isProblematicRoute ? 'problematic route' : 'dynamic usage'} in ${filePath}`);
    }
    
    // Check if file already has a runtime directive
    if (content.includes('export const runtime = "nodejs"') || 
        content.includes("export const runtime = 'nodejs'")) {
      // Double-check that no static exports exist
      if (content.includes('export const dynamic = "static"') ||
          content.includes('export const dynamic = "force-static"')) {
        // Remove any static exports
        content = content.replace(/export const dynamic = ".*?";?\n/g, '');
        modified = true;
        console.log(`⚠️ Removed static export directive from ${filePath}`);
      } else {
        console.log(`✓ ${filePath} already has Node.js runtime directive`);
        return false;
      }
    }
    
    // Remove any other runtime directives if they exist
    if (content.includes('export const runtime')) {
      content = content.replace(/export const runtime.*?\n/g, '');
      modified = true;
    }
    
    // Add runtime directive for Node.js at the top of the file
    const runtimeDirective = 'export const runtime = "nodejs";\nexport const dynamic = "force-dynamic";\n\n';
    content = runtimeDirective + content;
    modified = true;
    
    // Write back to the file
    fs.writeFileSync(filePath, content);
    console.log(`✅ Added Node.js runtime directive to ${filePath}`);
    
    return modified;
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error);
    return false;
  }
}

// Create or update the middleware.js file with proper Next.js config
function updateNextJsConfigForApi() {
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
  updateNextJsConfigForApi();
  
  // Find all API route files
  const apiDir = path.join('src', 'app', 'api');

  if (fs.existsSync(apiDir)) {
    const routeFiles = findRouteFiles(apiDir);
    console.log(`🔍 Found ${routeFiles.length} API route files`);
    
    let modifiedCount = 0;
    for (const routeFile of routeFiles) {
      if (processFile(routeFile)) {
        modifiedCount++;
      }
    }

    console.log(`✅ Modified ${modifiedCount} API route files`);
    
    if (modifiedCount === 0) {
      console.log('All dynamic API routes already have the correct runtime directive.');
    }
  } else {
    console.log('⚠️ API directory not found');
  }

  console.log('\n✅ Dynamic server usage fixes completed successfully!');
} catch (error) {
  console.error('❌ Error during dynamic server usage fixes:', error.message);
  process.exit(1);
} 