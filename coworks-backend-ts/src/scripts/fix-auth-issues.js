const fs = require('fs');
const path = require('path');

// Configuration
console.log('Starting API authorization fixes...');
const API_ROUTES_DIR = path.join(__dirname, '..', 'app', 'api');

// List of endpoints that should be secured but aren't
const endpointsToFix = [
  {
    path: '/api/admin/auth/login',
    file: path.join(API_ROUTES_DIR, 'admin', 'auth', 'login', 'route.ts'),
    // This is a special case - login should remain public
    shouldFix: false,
    reason: 'Authentication endpoint must remain public'
  },
  {
    path: '/api/admin/users/create',
    file: path.join(API_ROUTES_DIR, 'admin', 'users', 'create', 'route.ts'),
    shouldFix: true,
    authCheck: 'verifySuperAdmin', // Only super admin should create users
    reason: 'Admin user creation should be restricted to super admins'
  },
  {
    path: '/api/admin/users',
    file: path.join(API_ROUTES_DIR, 'admin', 'users', 'route.ts'),
    shouldFix: true,
    authCheck: 'verifyAdmin', // Admin access required to list users
    reason: 'Admin API for listing users should require admin authentication'
  },
  {
    path: '/api/bookings',
    file: path.join(API_ROUTES_DIR, 'bookings', 'route.ts'),
    shouldFix: true,
    authCheck: 'verifyAuth', // User authentication for bookings
    reason: 'Booking endpoints should require user authentication'
  },
  {
    path: '/api/bookings/[id]',
    file: path.join(API_ROUTES_DIR, 'bookings', '[id]', 'route.ts'),
    shouldFix: true,
    authCheck: 'verifyAuth', // User authentication for bookings
    reason: 'Booking management endpoints should require user authentication'
  },
  {
    path: '/api/profile',
    file: path.join(API_ROUTES_DIR, 'profile', 'route.ts'),
    shouldFix: true,
    authCheck: 'verifyAuth', // User authentication for profile
    reason: 'Profile access should require user authentication'
  },
  {
    path: '/api/profile/verification-status',
    file: path.join(API_ROUTES_DIR, 'profile', 'verification-status', 'route.ts'),
    shouldFix: true,
    authCheck: 'verifyAuth', // User authentication for profile
    reason: 'Profile verification status should require user authentication'
  },
  {
    path: '/api/branches/[id]',
    file: path.join(API_ROUTES_DIR, 'branches', '[id]', 'route.ts'),
    shouldFix: true,
    authCheck: 'verifyBranchAccess', // Branch management should be restricted
    methodsToFix: ['PUT', 'DELETE'],
    reason: 'Branch modification should require admin authentication'
  },
  {
    path: '/api/upload',
    file: path.join(API_ROUTES_DIR, 'upload', 'route.ts'),
    shouldFix: true,
    authCheck: 'verifyAuth', // User authentication for uploads
    reason: 'File upload should require user authentication'
  }
];

/**
 * Add authentication check to a route file
 */
function addAuthCheckToFile(filePath, authCheckName) {
  console.log(`Fixing authorization in ${filePath}`);
  
  try {
    // Read the file content
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if the file already has the auth check
    if (content.includes(`${authCheckName}(`)) {
      console.log(`  File already has ${authCheckName} check.`);
      return false;
    }
    
    // Get the appropriate import statement
    let importStatement;
    if (authCheckName === 'verifyAuth' || authCheckName === 'verifyTokenFromRequest') {
      importStatement = "import { verifyAuth } from '@/utils/jwt';";
    } else if (['verifyAdmin', 'verifySuperAdmin', 'verifyBranchAccess', 'verifyPermission'].includes(authCheckName)) {
      importStatement = `import { ${authCheckName} } from '@/utils/adminAuth';`;
    } else {
      console.error(`  Unknown auth check type: ${authCheckName}`);
      return false;
    }
    
    // Check if the import is already present
    if (!content.includes(importStatement)) {
      // Find the last import statement
      const lastImportIndex = content.lastIndexOf('import ');
      const endOfImports = content.indexOf('\n', lastImportIndex);
      
      // Insert the import after the last import
      content = content.slice(0, endOfImports + 1) + 
                importStatement + '\n' + 
                content.slice(endOfImports + 1);
    }
    
    // Find all async function handlers
    const httpMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'];
    let modified = false;
    
    for (const method of httpMethods) {
      const functionPattern = new RegExp(`export async function ${method}\\s*\\(([^)]+)\\)\\s*{`, 'g');
      const matches = content.matchAll(functionPattern);
      
      for (const match of matches) {
        const funcStart = match.index;
        const paramName = match[1].trim().split(':')[0].trim();
        
        // Find the first line of the function body
        const bodyStart = content.indexOf('{', funcStart) + 1;
        
        // Check if authentication is already present
        const nextChunk = content.substring(bodyStart, bodyStart + 500);
        if (
          nextChunk.includes(`${authCheckName}(`) || 
          nextChunk.includes('verifyAuth(') || 
          nextChunk.includes('verifyAdmin(') || 
          nextChunk.includes('verifySuperAdmin(') || 
          nextChunk.includes('verifyTokenFromRequest(')
        ) {
          console.log(`  ${method} handler already has auth check.`);
          continue;
        }
        
        // Insert the authentication check
        const authCheckCode = `
  try {
    const auth = await ${authCheckName}(${paramName});
    if ('status' in auth) {
      return auth as NextResponse;
    }
    
`;
        
        // Find the line after the opening brace of the function body
        let insertPos = content.indexOf('\n', bodyStart);
        insertPos = insertPos === -1 ? bodyStart : insertPos;
        
        // Insert the auth check at the beginning of the function body
        content = content.slice(0, insertPos) + authCheckCode + content.slice(insertPos);
        
        // Find all return statements in the function
        const functionEnd = findFunctionEnd(content, bodyStart);
        const functionBody = content.substring(bodyStart, functionEnd);
        
        // If there's a try block, we need to add a catch block
        if (!functionBody.includes('catch')) {
          // Find the closing brace of the function
          const indent = '  '; // Basic indentation for the catch block
          const catchBlock = `  } catch (error) {
    console.error('Error in ${method} ${filePath}:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred', error: (error as Error).message },
      { status: 500 }
    );
  }
`;
          
          // Add the catch block right before the end of the function
          content = content.slice(0, functionEnd - 1) + catchBlock + content.slice(functionEnd - 1);
        }
        
        modified = true;
        console.log(`  Added ${authCheckName} check to ${method} handler.`);
      }
    }
    
    if (modified) {
      // Create a backup of the original file
      fs.writeFileSync(`${filePath}.bak`, fs.readFileSync(filePath));
      
      // Write the modified content back to the file
      fs.writeFileSync(filePath, content);
      console.log(`  Updated ${filePath}`);
      return true;
    } else {
      console.log(`  No changes needed for ${filePath}`);
      return false;
    }
  } catch (error) {
    console.error(`  Error processing file ${filePath}:`, error);
    return false;
  }
}

/**
 * Find the end of a function in the code
 */
function findFunctionEnd(content, startFromPos) {
  let braceCount = 1; // Start with 1 for the opening brace
  let position = startFromPos;
  
  while (braceCount > 0 && position < content.length) {
    position++;
    if (content[position] === '{') {
      braceCount++;
    } else if (content[position] === '}') {
      braceCount--;
    }
  }
  
  return position + 1;
}

/**
 * Process the endpoints and fix authorization issues
 */
async function fixAuthorizationIssues() {
  let fixedCount = 0;
  
  for (const endpoint of endpointsToFix) {
    if (!endpoint.shouldFix) {
      console.log(`Skipping ${endpoint.path}: ${endpoint.reason}`);
      continue;
    }
    
    console.log(`\nChecking ${endpoint.path} (${endpoint.file})...`);
    
    if (!fs.existsSync(endpoint.file)) {
      console.error(`  File not found: ${endpoint.file}`);
      continue;
    }
    
    const fixed = addAuthCheckToFile(endpoint.file, endpoint.authCheck);
    if (fixed) fixedCount++;
  }
  
  console.log(`\nCompleted authorization fixes. Fixed ${fixedCount} files.`);
}

// Run the authorization fix function
fixAuthorizationIssues().catch(err => {
  console.error('Error fixing authorization issues:', err);
  process.exit(1);
}); 