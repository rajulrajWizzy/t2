#!/usr/bin/env node

/**
 * Runtime Fix Script
 * 
 * This script handles runtime configuration for API routes:
 * 1. Adds 'export const runtime = "nodejs"' to all API route files that don't have a runtime directive
 * 2. Replaces 'export const runtime = "edge"' with Node.js runtime to ensure compatibility with Sequelize
 * 3. Updates middleware.ts if needed
 * 4. Updates next.config.js with appropriate settings
 * 5. Ensures middleware.ts doesn't import Sequelize directly
 */

const fs = require('fs');
const path = require('path');

console.log('\x1b[33m%s\x1b[0m', '🔧 Fixing runtime configuration for API routes...');

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

// Process runtime directive for a file
function processRuntimeDirective(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Remove any duplicate runtime directives first
    const duplicatePattern = /(\/\/ Explicitly set Node\.js runtime for this route\s*\nexport const runtime = ["']nodejs["'];?\s*\n+)+/g;
    if (duplicatePattern.test(content)) {
      content = content.replace(duplicatePattern, '');
      modified = true;
    }
    
    // Check if Edge Runtime directive exists and replace it
    if (content.includes('export const runtime = "edge"') || content.includes("export const runtime = 'edge'")) {
      console.log(`🔄 Replacing Edge Runtime with Node.js runtime in ${filePath}`);
      
      // Replace Edge Runtime with Node.js runtime
      content = content.replace(
        /export\s+const\s+runtime\s*=\s*["']edge["'];?/g, 
        '// Edge Runtime disabled for better compatibility with Sequelize\nexport const runtime = "nodejs";'
      );
      
      modified = true;
    }
    // If no runtime directive exists, add it
    else if (!content.includes('export const runtime')) {
      console.log(`➕ Adding Node.js runtime directive to ${filePath}`);

      // Add the runtime directive at the beginning of the file
      content = '// Explicitly set Node.js runtime for this route\nexport const runtime = "nodejs";\n\n' + content;

      modified = true;
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

// Process next.config.js to ensure it doesn't have runtime option
function updateNextConfig() {
  const configPath = 'next.config.js';
  
  if (fs.existsSync(configPath)) {
    console.log('📝 Checking next.config.js for runtime settings...');
    
    let content = fs.readFileSync(configPath, 'utf8');
    let modified = false;
    
    // Remove runtime option from experimental section
    if (content.includes('runtime: \'nodejs\'') || content.includes('runtime: "nodejs"')) {
      console.log('🔄 Removing runtime option from next.config.js...');
      content = content.replace(/runtime:\s*["']nodejs["'][\s,]*/, '');
      modified = true;
    }
    
    // Check if we need to add serverComponentsExternalPackages
    if (!content.includes('serverComponentsExternalPackages')) {
      console.log('➕ Adding serverComponentsExternalPackages for Sequelize compatibility...');
      
      // Add serverComponentsExternalPackages to experimental section if it exists
      if (content.includes('experimental: {')) {
        content = content.replace(
          /experimental:\s*{/,
          'experimental: {\n    serverComponentsExternalPackages: ["sequelize", "pg", "pg-hstore"],'
        );
        modified = true;
      }
      // Add experimental section with serverComponentsExternalPackages if it doesn't exist
      else if (content.includes('module.exports = {')) {
        content = content.replace(
          /module\.exports\s*=\s*{/,
          'module.exports = {\n  experimental: {\n    serverComponentsExternalPackages: ["sequelize", "pg", "pg-hstore"],\n  },'
        );
        modified = true;
      }
    }
    
    if (modified) {
      // Write back to the file
      fs.writeFileSync(configPath, content);
      console.log('✅ Updated next.config.js');
    } else {
      console.log('✓ next.config.js already has appropriate settings');
    }
  }
}

// Fix middleware.ts to ensure it doesn't import Sequelize directly
function fixMiddlewareImports() {
  const middlewarePath = path.join('src', 'middleware.ts');
  if (!fs.existsSync(middlewarePath)) {
    console.log('⚠️ middleware.ts not found');
    return false;
  }
  
  try {
    let content = fs.readFileSync(middlewarePath, 'utf8');
    let modified = false;
    
    // Ensure runtime is set to nodejs
    if (!content.includes('export const runtime') || !content.includes('nodejs')) {
      console.log('➕ Adding Node.js runtime to middleware.ts');
      
      if (content.includes('export const runtime')) {
        // Replace existing runtime directive
        content = content.replace(
          /export\s+const\s+runtime\s*=\s*["'].*?["'](\s*;)?/,
          'export const runtime = \'nodejs\';'
        );
      } else {
        // Add runtime directive at the top
        content = '// Explicitly set Node.js runtime for middleware\nexport const runtime = \'nodejs\';\n\n' + content;
      }
      modified = true;
    }
    
    // Create index-safe.ts if it doesn't exist
    const indexSafePath = path.join('src', 'models', 'index-safe.ts');
    if (!fs.existsSync(indexSafePath)) {
      console.log('📝 Creating index-safe.ts for middleware...');
      
      const safeContent = `/**
 * SAFE model exports for middleware and edge functions
 * 
 * This file exports dummy models that can be safely imported in middleware and edge functions.
 * These are placeholder implementations that don't actually use Sequelize.
 * For real DB operations, import from '@/models' in API routes with 'nodejs' runtime.
 */

// Define safe types that mirror the actual models
export interface SafeBlacklistedToken {
  token: string;
  user_id: number;
  blacklisted_at: Date;
  expires_at: Date;
}

// Create a safe models object with mock implementations
const safeModels = {
  // Mock BlacklistedToken model that always returns false for middleware
  BlacklistedToken: {
    findOne: async () => null,
  },
};

export default safeModels;`;
      
      // Create directory if needed
      const modelsDir = path.join('src', 'models');
      if (!fs.existsSync(modelsDir)) {
        fs.mkdirSync(modelsDir, { recursive: true });
      }
      
      fs.writeFileSync(indexSafePath, safeContent);
    }
    
    // Fix jwt.ts to use safe imports in Edge
    const jwtPath = path.join('src', 'utils', 'jwt.ts');
    if (fs.existsSync(jwtPath)) {
      console.log('📝 Updating jwt.ts to handle Edge runtime safely...');
      
      let jwtContent = fs.readFileSync(jwtPath, 'utf8');
      const jwtModified = jwtContent.includes('process.env.NEXT_RUNTIME !== \'edge\'');
      
      if (!jwtModified) {
        // Update isTokenBlacklisted function
        jwtContent = jwtContent.replace(
          /export async function isTokenBlacklisted\(token: string\): Promise<boolean>\s*{[^}]*}/s,
          `export async function isTokenBlacklisted(token: string): Promise<boolean> {
  // This function should only be called from API routes, not middleware
  if (typeof window === 'undefined' && process.env.NEXT_RUNTIME !== 'edge') {
    try {
      // Dynamically import models only when needed
      const { default: models } = await import('@/models');
      const blacklistedToken = await models.BlacklistedToken.findOne({
        where: { token }
      });
      return !!blacklistedToken;
    } catch (error) {
      console.error('Error checking blacklisted token:', error);
    }
  }
  return false;
}`
        );
        
        // Update blacklistToken function
        jwtContent = jwtContent.replace(
          /export async function blacklistToken\(token: string, userId: number\): Promise<void>\s*{[^}]*}/s,
          `export async function blacklistToken(token: string, userId: number): Promise<void> {
  // Only run in Node.js environment, not Edge
  if (typeof window === 'undefined' && process.env.NEXT_RUNTIME !== 'edge') {
    try {
      const secretKey = getJwtSecretKey();
      // Verify token to get expiry
      const { payload } = await jwtVerify(token, secretKey);
      const expiresAt = payload.exp ? new Date(payload.exp * 1000) : new Date();
      
      // Dynamically import models
      const { default: models } = await import('@/models');
      
      await models.BlacklistedToken.create({
        token,
        user_id: userId,
        expires_at: expiresAt,
        blacklisted_at: new Date()
      });
    } catch (error) {
      console.error('Error blacklisting token:', error);
      throw error;
    }
  }
}`
        );
        
        fs.writeFileSync(jwtPath, jwtContent);
        console.log('✅ Updated jwt.ts for edge compatibility');
      }
    }
    
    if (modified) {
      fs.writeFileSync(middlewarePath, content);
      console.log('✅ Updated middleware.ts');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`Error fixing middleware: ${error.message}`);
    return false;
  }
}

// Fix files with duplicate runtime directives
function fixDuplicates() {
  const apiDir = path.join('src', 'app', 'api');
  if (fs.existsSync(apiDir)) {
    const routeFiles = findRouteFiles(apiDir);
    let fixedCount = 0;
    
    for (const filePath of routeFiles) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Check for multiple runtime directives
        const runtimeDirectiveMatches = content.match(/export const runtime\s*=/g);
        
        if (runtimeDirectiveMatches && runtimeDirectiveMatches.length > 1) {
          console.log(`🔍 Found duplicate runtime directives in ${filePath}`);
          
          // Fix the content by using a single runtime directive
          const lines = content.split('\n');
          const newLines = [];
          let runtimeAdded = false;
          
          for (const line of lines) {
            if (line.includes('export const runtime =')) {
              if (!runtimeAdded) {
                newLines.push('// Explicitly set Node.js runtime for this route');
                newLines.push('export const runtime = "nodejs";');
                runtimeAdded = true;
              }
              // Skip this line since we've already added a runtime directive
            } else if (!line.includes('Explicitly set Node.js runtime')) {
              newLines.push(line);
            }
          }
          
          fs.writeFileSync(filePath, newLines.join('\n'));
          fixedCount++;
        }
      } catch (error) {
        console.error(`Error checking for duplicates in ${filePath}:`, error);
      }
    }
    
    console.log(`✅ Fixed ${fixedCount} files with duplicate runtime directives`);
  }
}

// Fix JWT utilities
function fixJWTUtilities() {
  const jwtPath = path.join('src', 'utils', 'jwt.ts');
  
  if (!fs.existsSync(jwtPath)) {
    console.log('❌ JWT utilities not found at expected path');
    return false;
  }
  
  console.log('📝 Updating jwt.ts to handle Edge runtime safely...');

  // Read the current file
  let jwtContent = fs.readFileSync(jwtPath, 'utf8');
  
  // Check if the file already contains the required functions
  const hasVerifyJWT = jwtContent.includes('export async function verifyJWT');
  const hasVerifyAuth = jwtContent.includes('export async function verifyAuth');
  
  // No need to add duplicate exports at the bottom 
  // if the functions are already defined in the file
  if (hasVerifyJWT && hasVerifyAuth) {
    return true;
  }
  
  // If functions are missing, add them properly
  let updates = [];
  
  if (!hasVerifyJWT) {
    updates.push(`
/**
 * Alias for verifyToken - fixes import errors in routes
 * @param token JWT token to verify
 * @returns Object with validity status and decoded payload
 */
export async function verifyJWT(token: string): Promise<VerificationResult> {
  return verifyToken(token);
}
`);
  }
  
  if (!hasVerifyAuth) {
    updates.push(`
/**
 * Alias for verifyTokenFromRequest - fixes import errors in routes
 * @param request Request object with Authorization header
 * @returns Decoded token payload or error response
 */
export async function verifyAuth(request: Request): Promise<JWTPayload | NextResponse> {
  return verifyTokenFromRequest(request);
}
`);
  }
  
  // Only update file if needed
  if (updates.length > 0) {
    // Find a good place to insert the new functions - before the last export
    const lastExportIndex = jwtContent.lastIndexOf('export');
    if (lastExportIndex > 0) {
      const insertPosition = jwtContent.lastIndexOf('export function');
      if (insertPosition > 0) {
        jwtContent = jwtContent.substring(0, insertPosition) + 
                     updates.join('') + 
                     jwtContent.substring(insertPosition);
      } else {
        // Fallback: append to end
        jwtContent += updates.join('');
      }
    } else {
      // Fallback: append to end
      jwtContent += updates.join('');
    }
    
    // Write the file back
    fs.writeFileSync(jwtPath, jwtContent);
  }
  
  return true;
}

// Main execution
try {
  // Fix middleware issues first
  fixMiddlewareImports();
  
  // Fix any existing duplicate runtime directives
  fixDuplicates();
  
  // Find all API route files
  const apiDir = path.join('src', 'app', 'api');

  if (fs.existsSync(apiDir)) {
    const routeFiles = findRouteFiles(apiDir);
    console.log(`🔍 Found ${routeFiles.length} route files`);
    
    let modifiedCount = 0;
    for (const routeFile of routeFiles) {
      if (processRuntimeDirective(routeFile)) {
        modifiedCount++;
      }
    }

    console.log(`✅ Modified ${modifiedCount} route files`);
  } else {
    console.log('⚠️ API directory not found');
  }

  // Also modify the middleware.ts file if needed
  const middlewarePath = path.join('src', 'middleware.ts');
  if (fs.existsSync(middlewarePath)) {
    const middlewareModified = processRuntimeDirective(middlewarePath);
    if (middlewareModified) {
      console.log('✅ Modified middleware.ts');
    } else {
      console.log('✓ middleware.ts already has appropriate runtime directive');
    }
  }

  // Update next.config.js
  updateNextConfig();

  console.log('\n✅ Runtime fixes completed successfully!');
  console.log('🔔 Note: You may need to restart your development server for changes to take effect.');
} catch (error) {
  console.error('❌ Error during runtime fix process:', error.message);
  process.exit(1);
}
