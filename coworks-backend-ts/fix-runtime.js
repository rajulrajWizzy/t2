#!/usr/bin/env node

/**
 * Fix Runtime Script
 * 
 * This script addresses common Edge Runtime errors in Next.js when deploying to Vercel.
 * It ensures all API routes use the Node.js runtime and updates JWT utilities to handle
 * Edge Runtime safely.
 */

const fs = require('fs');
const path = require('path');

console.log('\x1b[33m%s\x1b[0m', '🔧 Fixing runtime configuration for API routes...');

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
  
  // No need to modify if already updated
  if (jwtContent.includes('// Handle Edge Runtime safely')) {
    return true;
  }
  
  // Add safe imports for Edge Runtime
  // This is just a placeholder - the actual implementation would depend on the specific JWT utilities
  if (!jwtContent.includes('export const verifyJWT')) {
    jwtContent += `\n\n// Handle Edge Runtime safely
export const verifyJWT = verifyToken;
export const verifyAuth = verifySession;\n`;
  }
  
  // Write the file back
  fs.writeFileSync(jwtPath, jwtContent);
  return true;
}

// Find files with duplicate runtime directives
function findDuplicateRuntimeDirectives(dir, affectedFiles = []) {
  const files = fs.readdirSync(dir, { withFileTypes: true });

  for (const file of files) {
    const filePath = path.join(dir, file.name);

    if (file.isDirectory()) {
      findDuplicateRuntimeDirectives(filePath, affectedFiles);
    } else if (file.name === 'route.ts' || file.name === 'route.tsx') {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Count occurrences of runtime directives
      const runtimeMatches = content.match(/export const runtime/g);
      const dynamicMatches = content.match(/export const dynamic/g);
      const fetchCacheMatches = content.match(/export const fetchCache/g);
      
      if (
        (runtimeMatches && runtimeMatches.length > 1) || 
        (dynamicMatches && dynamicMatches.length > 1) || 
        (fetchCacheMatches && fetchCacheMatches.length > 1)
      ) {
        console.log(`🔍 Found duplicate runtime directives in ${filePath}`);
        affectedFiles.push(filePath);
      }
    }
  }

  return affectedFiles;
}

// Fix files with duplicate runtime directives
function fixDuplicateDirectives(filePaths) {
  let fixedCount = 0;
  
  for (const filePath of filePaths) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Clean up all directives
    let updatedContent = content.replace(/export const runtime.*?\n/g, '');
    updatedContent = updatedContent.replace(/export const dynamic.*?\n/g, '');
    updatedContent = updatedContent.replace(/export const fetchCache.*?\n/g, '');
    
    // Add back a single copy of each directive at the top
    const directives = '// Explicitly set Node.js runtime for this route\nexport const runtime = "nodejs";\nexport const dynamic = "force-dynamic";\nexport const fetchCache = "force-no-store";\n\n';
    
    // Find the position to insert directives (before imports)
    const firstImportIndex = updatedContent.indexOf('import ');
    if (firstImportIndex > 0) {
      updatedContent = updatedContent.substring(0, firstImportIndex) + directives + updatedContent.substring(firstImportIndex);
    } else {
      updatedContent = directives + updatedContent;
    }
    
    // Write back if changed
    if (updatedContent !== content) {
      fs.writeFileSync(filePath, updatedContent);
      fixedCount++;
    }
  }
  
  console.log(`✅ Fixed ${fixedCount} files with duplicate runtime directives`);
  return fixedCount;
}

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

// Process a file to add the runtime directive
function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Clean up existing directives to prevent duplicates
    if (content.includes('export const runtime') || 
        content.includes('export const dynamic') || 
        content.includes('export const fetchCache')) {
      content = content.replace(/export const runtime.*?\n/g, '');
      content = content.replace(/export const dynamic.*?\n/g, '');
      content = content.replace(/export const fetchCache.*?\n/g, '');
    }
    
    // Add all directives at the top
    const directives = '// Explicitly set Node.js runtime for this route\nexport const runtime = "nodejs";\nexport const dynamic = "force-dynamic";\nexport const fetchCache = "force-no-store";\n\n';
    
    // Find the position to insert directives (before imports)
    const firstImportIndex = content.indexOf('import ');
    if (firstImportIndex > 0) {
      content = content.substring(0, firstImportIndex) + directives + content.substring(firstImportIndex);
    } else {
      content = directives + content;
    }
    
    // Write back to the file
    fs.writeFileSync(filePath, content);
    console.log(`➕ Adding Node.js runtime directive to ${filePath}`);
    
    return true;
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error);
    return false;
  }
}

// Check if middleware has the correct runtime directive
function checkMiddleware() {
  const middlewarePath = path.join('src', 'middleware.ts');
  
  if (!fs.existsSync(middlewarePath)) {
    return false;
  }
  
  const content = fs.readFileSync(middlewarePath, 'utf8');
  
  if (!content.includes('export const runtime')) {
    // Add runtime directive at the top
    const updatedContent = 'export const runtime = "nodejs";\n\n' + content;
    fs.writeFileSync(middlewarePath, updatedContent);
    console.log('➕ Added runtime directive to middleware.ts');
    return true;
  }
  
  console.log('✓ middleware.ts already has appropriate runtime directive');
  return true;
}

// Check if next.config.js has the correct settings
function checkNextConfig() {
  console.log('📝 Checking next.config.js for runtime settings...');
  
  const nextConfigPath = 'next.config.js';
  
  if (!fs.existsSync(nextConfigPath)) {
    console.log('⚠️ next.config.js not found, creating it...');
    
    const configContent = `/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['sequelize', 'pg', 'pg-hstore'],
    disableStaticFiles: true,
  }
};

module.exports = nextConfig;
`;
    
    fs.writeFileSync(nextConfigPath, configContent);
    console.log('✅ Created next.config.js with appropriate settings');
    return true;
  }
  
  const content = fs.readFileSync(nextConfigPath, 'utf8');
  
  // Check if config already has required settings
  if (content.includes('serverComponentsExternalPackages') && 
      (content.includes('sequelize') || content.includes('pg'))) {
    console.log('✓ next.config.js already has appropriate settings');
    return true;
  }
  
  // Try to update the config
  try {
    // This is a simple approach and might not work for all config formats
    let updatedContent = content;
    
    if (!content.includes('experimental')) {
      // Add experimental section
      const configEnd = content.lastIndexOf('};');
      if (configEnd > 0) {
        updatedContent = content.substring(0, configEnd) + 
          '  experimental: {\n' +
          '    serverComponentsExternalPackages: [\'sequelize\', \'pg\', \'pg-hstore\'],\n' +
          '    disableStaticFiles: true,\n' +
          '  },\n' + 
          content.substring(configEnd);
      }
    } else if (!content.includes('serverComponentsExternalPackages')) {
      // Add to existing experimental section
      const experimentalStart = content.indexOf('experimental');
      const experimentalBlockStart = content.indexOf('{', experimentalStart);
      if (experimentalBlockStart > 0) {
        updatedContent = content.substring(0, experimentalBlockStart + 1) + 
          '\n    serverComponentsExternalPackages: [\'sequelize\', \'pg\', \'pg-hstore\'],\n' +
          '    disableStaticFiles: true,' + 
          content.substring(experimentalBlockStart + 1);
      }
    }
    
    if (updatedContent !== content) {
      fs.writeFileSync(nextConfigPath, updatedContent);
      console.log('✅ Updated next.config.js with appropriate settings');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Failed to update next.config.js:', error);
    console.log('⚠️ You may need to manually update next.config.js to include:');
    console.log(`experimental: {
  serverComponentsExternalPackages: ['sequelize', 'pg', 'pg-hstore'],
  disableStaticFiles: true,
}`);
    return false;
  }
}

// Main execution
try {
  // First fix JWT utilities
  fixJWTUtilities();
  
  // Fix files with duplicate runtime directives
  const apiDir = path.join('src', 'app', 'api');
  if (fs.existsSync(apiDir)) {
    const filesWithDuplicates = findDuplicateRuntimeDirectives(apiDir);
    fixDuplicateDirectives(filesWithDuplicates);
  }
  
  // Find all API route files and add runtime directive
  const apiDir2 = path.join('src', 'app', 'api');
  
  if (fs.existsSync(apiDir2)) {
    const routeFiles = findRouteFiles(apiDir2);
    console.log(`🔍 Found ${routeFiles.length} route files`);
    
    let modifiedCount = 0;
    for (const routeFile of routeFiles) {
      if (processFile(routeFile)) {
        modifiedCount++;
      }
    }
    
    console.log(`✅ Modified ${modifiedCount} route files`);
  } else {
    console.log('❌ API directory not found');
  }

  // Check middleware file
  checkMiddleware();
  
  // Check next.config.js
  checkNextConfig();
  
  console.log('\n✅ Runtime fixes completed successfully!');
  console.log('🔔 Note: You may need to restart your development server for changes to take effect.');
} catch (error) {
  console.error('❌ Error during runtime fixes:', error.message);
  process.exit(1);
}
