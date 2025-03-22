#!/usr/bin/env node

/**
 * Runtime Fix Script
 * 
 * This script handles runtime configuration for API routes:
 * 1. Adds 'export const runtime = "nodejs"' to all API route files that don't have a runtime directive
 * 2. Replaces 'export const runtime = "edge"' with Node.js runtime to ensure compatibility with Sequelize
 * 3. Updates middleware.ts if needed
 * 4. Updates next.config.js with appropriate settings
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

// Ensure next.config.js has appropriate runtime settings
function updateNextConfig() {
  const configPath = 'next.config.js';
  
  if (fs.existsSync(configPath)) {
    console.log('📝 Checking next.config.js for runtime settings...');
    
    let content = fs.readFileSync(configPath, 'utf8');
    let modified = false;
    
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

// Main execution
try {
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
