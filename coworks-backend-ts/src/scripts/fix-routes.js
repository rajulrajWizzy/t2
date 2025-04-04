const fs = require('fs');
const path = require('path');

function fixRouteFile(routePath) {
  if (!fs.existsSync(routePath)) {
    console.error(`ERROR: Route file not found at: ${routePath}`);
    return false;
  }
  
  console.log(`Found route file: ${routePath}`);
  
  // Read the file contents
  const content = fs.readFileSync(routePath, 'utf8');
  
  // Create a fixed version of the file with proper export directives
  const fixedContent = content
    // Remove any comments before directives to ensure clean removal
    .replace(/\/\/ Explicitly set Node\.js runtime for this route\s+/g, '')
    .replace(/\/\/ Set dynamic to force-dynamic to ensure data is always fresh\s+/g, '')
    .replace(/\/\/.*\s+/g, '') // Remove other comments that might be before directives
    // Ensure we have only one of each directive
    .replace(/export const runtime = "nodejs";\s+/g, '')
    ;
  
  // Add clean directives at the top
  const cleanDirectives = `// Properly configured Next.js API route directives
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

`;
  
  // Combine directives with cleaned content
  const finalContent = cleanDirectives + fixedContent;
  
  // Create a backup of the original file
  fs.writeFileSync(`${routePath}.bak`, content);
  console.log(`Created backup at: ${routePath}.bak`);
  
  // Write the fixed content
  fs.writeFileSync(routePath, finalContent);
  console.log(`Updated route file with fixed directives`);
  
  return true;
}

function fixAdminRoutes() {
  try {
    console.log('Fixing admin API routes...');
    
    // List of problematic routes to fix
    const routesToFix = [
      path.join(__dirname, '..', 'app', 'api', 'admin', 'auth', 'login', 'route.ts'),
      path.join(__dirname, '..', 'app', 'api', 'admin', 'dashboard', 'stats', 'route.ts')
    ];
    
    let fixedCount = 0;
    
    // Fix each route in the list
    for (const routePath of routesToFix) {
      if (fixRouteFile(routePath)) {
        fixedCount++;
      }
    }
    
    console.log(`Fixed ${fixedCount} routes successfully`);
    
    console.log('\nFixing Next.js development server cache...');
    // Next.js caches app routes in .next directory - we need to clear it
    const nextCachePath = path.join(__dirname, '..', '..', '.next');
    if (fs.existsSync(nextCachePath)) {
      console.log('Clearing Next.js cache...');
      // We won't actually delete the cache here, just suggest to restart
      console.log('RECOMMENDATION: Stop the development server and restart it with: npm run dev');
    }
    
  } catch (error) {
    console.error('Error fixing routes:', error);
  }
}

fixAdminRoutes(); 