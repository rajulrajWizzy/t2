#!/usr/bin/env node

/**
 * Runtime Fix Script
 * 
 * This script handles runtime configuration for API routes:
 * 1. Adds 'export const runtime = "nodejs"' to all API route files that don't have a runtime directive
 * 2. Replaces 'export const runtime = "edge"' with Node.js runtime to ensure compatibility with Sequelize
 * 3. Updates middleware.ts if needed
 * 4. Updates next.config.js with appropriate settings
 * 5. Fixes conflict between transpilePackages and serverComponentsExternalPackages
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
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Check if Edge Runtime directive exists and replace it
  if (content.includes('export const runtime = "edge"') || content.includes("export const runtime = 'edge'")) {
    console.log(`🔄 Replacing Edge Runtime with Node.js runtime in ${filePath}`);
    
    // Replace Edge Runtime with Node.js runtime
    content = content.replace(
      /export\s+const\s+runtime\s*=\s*["']edge["'];?/g, 
      '// Edge Runtime disabled for better compatibility with Sequelize\nexport const runtime = "nodejs";'
    );
    
    fs.writeFileSync(filePath, content);
    modified = true;
  } 
  // If no runtime directive exists, add it
  else if (!content.includes('export const runtime')) {
    console.log(`➕ Adding Node.js runtime directive to ${filePath}`);

    // Add the runtime directive at the beginning of the file
    content = '// Explicitly set Node.js runtime for this route\nexport const runtime = "nodejs";\n\n' + content;

    // Write back to the file
    fs.writeFileSync(filePath, content);
    modified = true;
  }

  return modified;
}

// Ensure next.config.js has appropriate runtime settings and fix conflicts
function updateNextConfig() {
  const configPath = 'next.config.js';
  
  if (fs.existsSync(configPath)) {
    console.log('📝 Checking next.config.js for runtime settings and package conflicts...');
    
    let content = fs.readFileSync(configPath, 'utf8');
    let modified = false;
    
    // Check for conflicting packages between transpilePackages and serverComponentsExternalPackages
    if (content.includes('transpilePackages') && content.includes('serverComponentsExternalPackages')) {
      console.log('⚠️ Checking for package conflicts between transpilePackages and serverComponentsExternalPackages...');
      
      try {
        // Extract serverComponentsExternalPackages
        const serverComponentsMatch = content.match(/serverComponentsExternalPackages\s*:\s*\[(.*?)\]/s);
        const transpilePackagesMatch = content.match(/transpilePackages\s*:\s*\[(.*?)\]/s);
        
        if (serverComponentsMatch && transpilePackagesMatch) {
          const serverComponents = serverComponentsMatch[1]
            .replace(/'/g, '"')
            .split(',')
            .map(item => item.trim().replace(/^["']|["']$/g, ''))
            .filter(Boolean);
          
          const transpilePackages = transpilePackagesMatch[1]
            .replace(/'/g, '"')
            .split(',')
            .map(item => item.trim().replace(/^["']|["']$/g, ''))
            .filter(Boolean);
          
          // Find conflicts (packages in both arrays)
          const conflicts = serverComponents.filter(pkg => transpilePackages.includes(pkg));
          
          if (conflicts.length > 0) {
            console.log(`⚠️ Found conflicts: ${conflicts.join(', ')} appears in both arrays`);
            
            // Create a backup
            fs.copyFileSync(configPath, `${configPath}.bak`);
            console.log('💾 Created backup of next.config.js');
            
            // Remove conflicts from transpilePackages
            const nonConflictingPackages = transpilePackages.filter(pkg => !conflicts.includes(pkg));
            
            if (nonConflictingPackages.length === 0) {
              // If there are no non-conflicting packages left, remove the transpilePackages line
              content = content.replace(/\s*transpilePackages\s*:\s*\[(.*?)\],?/s, '');
            } else {
              // Replace transpilePackages with non-conflicting packages
              const newTranspilePackages = `transpilePackages: [${nonConflictingPackages.map(pkg => `'${pkg}'`).join(', ')}]`;
              content = content.replace(/transpilePackages\s*:\s*\[(.*?)\]/s, newTranspilePackages);
            }
            
            fs.writeFileSync(configPath, content, 'utf8');
            console.log('✅ Fixed conflicts in next.config.js');
            modified = true;
          } else {
            console.log('✓ No conflicts found between transpilePackages and serverComponentsExternalPackages');
          }
        }
      } catch (error) {
        console.error('❌ Error checking for package conflicts:', error.message);
      }
    }
    
    // If the file doesn't have experimental setting for runtime
    if (!content.includes('experimental') || !content.includes('esmExternals')) {
      try {
        if (!fs.existsSync(`${configPath}.bak`)) {
          // Make a backup if we haven't already
          fs.copyFileSync(configPath, `${configPath}.bak`);
          console.log('💾 Created backup of next.config.js');
        }
        
        // Simple string-based approach - find the config object
        if (content.includes('const nextConfig = {')) {
          // Add experimental settings if the config object exists
          if (!content.includes('experimental:')) {
            content = content.replace(
              'const nextConfig = {',
              'const nextConfig = {\n  experimental: {\n    esmExternals: true\n  },'
            );
            modified = true;
          } else if (!content.includes('esmExternals')) {
            content = content.replace(
              /experimental:\s*{/,
              'experimental: {\n    esmExternals: true,'
            );
            modified = true;
          }
          
          if (modified) {
            fs.writeFileSync(configPath, content);
            console.log('✅ Updated next.config.js with experimental settings');
          } else {
            console.log('✓ next.config.js already has appropriate settings');
          }
        } else {
          console.log('⚠️ Could not safely update next.config.js - please add experimental.esmExternals: true manually');
        }
      } catch (error) {
        console.error('❌ Error updating next.config.js:', error.message);
      }
    } else {
      console.log('✓ next.config.js already has appropriate experimental settings');
    }
  } else {
    console.log('🆕 Creating next.config.js with appropriate runtime settings...');
    
    // Create a basic next.config.js file
    const basicConfig = `/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    esmExternals: true
  }
};

module.exports = nextConfig;
`;
    
    fs.writeFileSync(configPath, basicConfig);
    console.log('✅ Created next.config.js with experimental settings');
  }
}

// Main execution
try {
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