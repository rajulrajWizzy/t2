#!/usr/bin/env node

/**
 * This script fixes common Vercel deployment issues.
 * It should be run as part of the build process.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Vercel Build Fix Script - Starting...');

// Helper functions
function replaceInFile(filePath, searchValue, replaceValue) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️ File not found: ${filePath}`);
      return false;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    if (!content.includes(searchValue)) {
      console.log(`ℹ️ No match found in ${filePath} for: ${searchValue.substring(0, 20)}...`);
      return false;
    }

    const newContent = content.replace(searchValue, replaceValue);
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`✅ Updated ${filePath}`);
    return true;
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
    return false;
  }
}

// 1. Fix date-fns compatibility
function fixDateFns() {
  try {
    console.log('📅 Checking date-fns version...');
    
    // Update package.json if needed
    const packageJsonPath = path.join(__dirname, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    if (packageJson.dependencies['date-fns'] !== '2.30.0') {
      packageJson.dependencies['date-fns'] = '2.30.0';
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
      console.log('✅ Updated package.json - date-fns set to 2.30.0');
      
      // Force reinstall of date-fns
      console.log('🔄 Reinstalling date-fns@2.30.0...');
      execSync('npm install date-fns@2.30.0 --save-exact', { stdio: 'inherit' });
    } else {
      console.log('✓ date-fns already at correct version (2.30.0)');
    }
  } catch (error) {
    console.error('❌ Error fixing date-fns:', error.message);
  }
}

// 2. Fix Edge Runtime issues
function fixEdgeRuntime() {
  try {
    console.log('🌐 Fixing Edge Runtime issues...');
    
    // Create middleware.config.js
    const middlewareConfigPath = path.join(__dirname, 'middleware.config.js');
    const middlewareConfig = `module.exports = {
  // Use Node.js environment instead of Edge runtime for middleware
  // This is needed for Sequelize compatibility
  runtime: 'nodejs'
};`;
    fs.writeFileSync(middlewareConfigPath, middlewareConfig);
    console.log('✅ Created middleware.config.js');
    
    // Add runtime directive to middleware.ts
    const middlewarePath = path.join(__dirname, 'src', 'middleware.ts');
    if (fs.existsSync(middlewarePath)) {
      const middlewareContent = fs.readFileSync(middlewarePath, 'utf8');
      if (!middlewareContent.includes("export const runtime = 'nodejs'")) {
        const newContent = "// Use Node.js runtime for middleware\nexport const runtime = 'nodejs';\n\n" + middlewareContent;
        fs.writeFileSync(middlewarePath, newContent);
        console.log('✅ Added runtime directive to middleware.ts');
      }
    }
    
    // Update next.config.mjs
    const nextConfigPath = path.join(__dirname, 'next.config.mjs');
    if (fs.existsSync(nextConfigPath)) {
      const nextConfig = fs.readFileSync(nextConfigPath, 'utf8');
      
      // Check if disableEdgeRuntime is already set
      if (!nextConfig.includes('disableEdgeRuntime: true')) {
        // Try different regex patterns to find the right place to insert our settings
        const patterns = [
          {
            search: /experimental:\s*{([^}]*)}/,
            replace: (match, p1) => `experimental: {${p1}, runtime: 'nodejs', disableEdgeRuntime: true}`
          },
          {
            search: /const nextConfig = {/,
            replace: `const nextConfig = {\n  experimental: {\n    runtime: 'nodejs',\n    disableEdgeRuntime: true,\n    serverComponentsExternalPackages: ['sequelize', 'pg', 'pg-hstore', 'bcryptjs']\n  },`
          }
        ];
        
        let updated = false;
        for (const pattern of patterns) {
          if (nextConfig.match(pattern.search)) {
            const newConfig = nextConfig.replace(pattern.search, pattern.replace);
            fs.writeFileSync(nextConfigPath, newConfig);
            console.log('✅ Updated next.config.mjs with Edge Runtime settings');
            updated = true;
            break;
          }
        }
        
        if (!updated) {
          console.log('⚠️ Could not update next.config.mjs automatically, please check manually');
        }
      } else {
        console.log('✓ next.config.mjs already has Edge Runtime settings');
      }
    }
  } catch (error) {
    console.error('❌ Error fixing Edge Runtime issues:', error.message);
  }
}

// 3. Fix Client/Server Component conflicts
function fixClientServerConflicts() {
  try {
    console.log('🧩 Fixing Client/Server Component conflicts...');
    
    // Check layout.tsx
    const layoutPath = path.join(__dirname, 'src', 'app', 'layout.tsx');
    if (fs.existsSync(layoutPath)) {
      const layoutContent = fs.readFileSync(layoutPath, 'utf8');
      
      // Remove 'use client' directive if it exists along with metadata export
      if (layoutContent.includes("'use client'") && layoutContent.includes('export const metadata')) {
        const newContent = layoutContent.replace("'use client';", '').replace("'use client'", '');
        fs.writeFileSync(layoutPath, newContent);
        console.log('✅ Removed client directive from layout.tsx');
      }
    }
    
    // Find and fix other components with conflicts
    const appDir = path.join(__dirname, 'src', 'app');
    findAndFixComponentConflicts(appDir);
  } catch (error) {
    console.error('❌ Error fixing Client/Server Component conflicts:', error.message);
  }
}

// Helper to find and fix component conflicts
function findAndFixComponentConflicts(dir) {
  try {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stats = fs.statSync(filePath);
      
      if (stats.isDirectory()) {
        findAndFixComponentConflicts(filePath);
      } else if (file.endsWith('.tsx') || file.endsWith('.jsx')) {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Check for client directive + metadata export conflict
        if (content.includes("'use client'") && content.includes('export const metadata')) {
          const newContent = content.replace("'use client';", '').replace("'use client'", '');
          fs.writeFileSync(filePath, newContent);
          console.log(`✅ Fixed client/server conflict in ${filePath}`);
        }
      }
    }
  } catch (error) {
    console.error(`❌ Error searching directory ${dir}:`, error.message);
  }
}

// 4. Add Node.js runtime directive to API routes
function addRuntimeDirectivesToApiRoutes() {
  try {
    console.log('🔄 Adding Node.js runtime directive to API routes...');
    
    // Try to use the existing script if available
    const scriptPath = path.join(__dirname, 'add-runtime-directive.js');
    if (fs.existsSync(scriptPath)) {
      console.log('🔄 Running add-runtime-directive.js...');
      execSync('node add-runtime-directive.js', { stdio: 'inherit' });
    } else {
      console.log('⚠️ add-runtime-directive.js not found, creating basic version...');
      
      // Create a simplified version
      const apiDir = path.join(__dirname, 'src', 'app', 'api');
      addRuntimeDirectiveRecursive(apiDir);
    }
  } catch (error) {
    console.error('❌ Error adding runtime directives to API routes:', error.message);
  }
}

// Helper to recursively add runtime directive
function addRuntimeDirectiveRecursive(dir) {
  try {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stats = fs.statSync(filePath);
      
      if (stats.isDirectory()) {
        addRuntimeDirectiveRecursive(filePath);
      } else if (file === 'route.ts' || file === 'route.js') {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Skip if directive already exists
        if (!content.includes("export const runtime = 'nodejs'")) {
          const directive = "// Use Node.js runtime for Sequelize compatibility\nexport const runtime = 'nodejs';\n\n";
          const newContent = directive + content;
          fs.writeFileSync(filePath, newContent);
          console.log(`✅ Added runtime directive to ${filePath}`);
        }
      }
    }
  } catch (error) {
    console.error(`❌ Error processing directory ${dir}:`, error.message);
  }
}

// Run all fixes
try {
  fixDateFns();
  fixEdgeRuntime();
  fixClientServerConflicts();
  addRuntimeDirectivesToApiRoutes();
  
  console.log('✅ All fixes completed successfully!');
} catch (error) {
  console.error('❌ Error in fix script:', error);
  process.exit(1);
} 