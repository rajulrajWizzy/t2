// Script to apply auth helper to all routes
// Run with: node src/scripts/apply-auth-helper.js

const fs = require('fs');
const path = require('path');

// Define the routes we want to update
const routesToUpdate = [
  'src/app/api/admin/dashboard/stats/route.ts',
  'src/app/api/admin/profile/route.ts',
  'src/app/api/admin/profile/update/route.ts',
  'src/app/api/admin/seating-types/route.ts',
  'src/app/api/admin/users/route.ts',
  'src/app/api/bookings/route.ts',
  'src/app/api/branches/route.ts',
  'src/app/api/profile/route.ts',
  'src/app/api/support/tickets/route.ts'
];

let report = '# Auth Helper Implementation Report\n\n';
report += 'The following routes have been updated to use the standardized auth helper:\n\n';

// Process each route
for (const routePath of routesToUpdate) {
  try {
    const fullPath = path.resolve(process.cwd(), routePath);
    
    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      report += `- ❌ ${routePath} - File not found\n`;
      console.log(`File not found: ${fullPath}`);
      continue;
    }
    
    console.log(`Processing: ${routePath}`);
    
    // Read the file
    let content = fs.readFileSync(fullPath, 'utf8');
    
    // Check for imports of old auth functions
    const hasVerifyAuth = content.includes('verifyAuth');
    const hasVerifyAdmin = content.includes('verifyAdmin');
    
    // Skip if it already has our new auth helper
    if (content.includes('validateAuthToken') || content.includes('validateAdminAccess')) {
      report += `- ✅ ${routePath} - Already using auth helper\n`;
      console.log(`Already using auth helper: ${routePath}`);
      continue;
    }
    
    let hasChanges = false;
    
    // Update imports
    if (hasVerifyAuth) {
      const newContent = content.replace(
        /import\s+{([^}]*)verifyAuth([^}]*)}(\s+from\s+['"][@/\w-]+['"])/g, 
        'import {$1$2}$3\nimport { validateAuthToken } from \'@/utils/auth-helper\''
      );
      if (newContent !== content) {
        content = newContent;
        hasChanges = true;
        console.log(`Updated verifyAuth import in ${routePath}`);
      }
    } else if (hasVerifyAdmin) {
      const newContent = content.replace(
        /import\s+{([^}]*)verifyAdmin([^}]*)}(\s+from\s+['"][@/\w-]+['"])/g, 
        'import {$1$2}$3\nimport { validateAdminAccess } from \'@/utils/auth-helper\''
      );
      if (newContent !== content) {
        content = newContent;
        hasChanges = true;
        console.log(`Updated verifyAdmin import in ${routePath}`);
      }
    } else {
      // Add imports if none found
      const newContent = content.replace(
        /import.*NextRequest.*from\s+['"]next\/server['"];/,
        '$&\nimport { validateAuthToken } from \'@/utils/auth-helper\';'
      );
      if (newContent !== content) {
        content = newContent;
        hasChanges = true;
        console.log(`Added validateAuthToken import in ${routePath}`);
      }
    }
    
    // Update verifyAuth usage
    if (hasVerifyAuth) {
      const newContent = content.replace(
        /const\s+([\w]+)\s+=\s+await\s+verifyAuth\(([^)]+)\);/g,
        'const authResult = await validateAuthToken($2);\n\n  if (!authResult.isValid || !authResult.decoded) {\n    return authResult.errorResponse;\n  }\n\n  const $1 = authResult.decoded;'
      );
      if (newContent !== content) {
        content = newContent;
        hasChanges = true;
        console.log(`Updated verifyAuth usage in ${routePath}`);
      }
    }
    
    // Update verifyAdmin usage
    if (hasVerifyAdmin) {
      const newContent = content.replace(
        /const\s+([\w]+)\s+=\s+await\s+verifyAdmin\(([^)]+)\);/g,
        'const authResult = await validateAdminAccess($2);\n\n  if (!authResult.isValid || !authResult.decoded) {\n    return authResult.errorResponse;\n  }\n\n  const $1 = authResult.decoded;'
      );
      if (newContent !== content) {
        content = newContent;
        hasChanges = true;
        console.log(`Updated verifyAdmin usage in ${routePath}`);
      }
      
      // Fix admin status check
      const statusCheckRegex = /if\s+\(['"]status['"]\s+in\s+([\w]+)\)\s+{\s+return\s+([\w]+)\s+as\s+NextResponse;\s+}/g;
      if (statusCheckRegex.test(content)) {
        content = content.replace(
          statusCheckRegex,
          '// Auth check already handled by validateAdminAccess'
        );
        hasChanges = true;
        console.log(`Fixed admin status check in ${routePath}`);
      }
    }
    
    // Add CORS headers import if missing
    if (!content.includes('corsHeaders')) {
      const newContent = content.replace(
        /import\s+{([^}]*)}(\s+from\s+['"][@/\w-]+['"]);/,
        'import {$1}$2;\nimport { corsHeaders } from \'@/utils/jwt-wrapper\';'
      );
      if (newContent !== content) {
        content = newContent;
        hasChanges = true;
        console.log(`Added corsHeaders import in ${routePath}`);
      }
    }
    
    // Add CORS headers to error responses
    const errorResponseRegex = /NextResponse\.json\([^,]+,\s*{\s*status:\s*(\d+)\s*}\)/g;
    if (errorResponseRegex.test(content)) {
      content = content.replace(
        errorResponseRegex,
        'NextResponse.json($&, { status: $1, headers: corsHeaders })'
      );
      hasChanges = true;
      console.log(`Added CORS headers to error responses in ${routePath}`);
    }
    
    // Add OPTIONS handler if missing
    if (!content.includes('OPTIONS()')) {
      content += `\n\n// OPTIONS request for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders
  });
}\n`;
      hasChanges = true;
      console.log(`Added OPTIONS handler in ${routePath}`);
    }
    
    if (hasChanges) {
      // Write changes back to file
      fs.writeFileSync(fullPath, content, 'utf8');
      report += `- ✅ ${routePath} - Updated successfully\n`;
      console.log(`Successfully updated ${routePath}`);
    } else {
      report += `- ⚠️ ${routePath} - No changes needed or detected\n`;
      console.log(`No changes needed for ${routePath}`);
    }
  } catch (error) {
    report += `- ❌ ${routePath} - Error: ${error.message}\n`;
    console.error(`Error processing ${routePath}:`, error);
  }
}

report += '\n## Summary\n\n';
report += 'Auth helper has been applied to API routes to standardize authentication.\n';
report += 'The implementation includes:\n\n';
report += '1. Consistent token validation\n';
report += '2. Proper error handling with CORS headers\n';
report += '3. Type-safe JWT payloads\n';
report += '4. OPTIONS handlers for CORS preflight requests\n';

// Write the report to a file
const reportPath = path.resolve(process.cwd(), 'auth-helper-implementation-report.md');
fs.writeFileSync(reportPath, report, 'utf8');

console.log(`\nAuth helper implementation completed. Report saved to ${reportPath}`); 