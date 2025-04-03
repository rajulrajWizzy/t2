// Script to fix all dynamic route parameters in Next.js app
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Base directory for API routes
const apiDir = path.join(__dirname, 'src', 'app', 'api');

// Function to recursively find all directories
function findAllDirs(dir, results = []) {
  if (!fs.existsSync(dir)) return results;
  
  const items = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const item of items) {
    if (item.isDirectory()) {
      const fullPath = path.join(dir, item.name);
      results.push({ name: item.name, path: fullPath });
      findAllDirs(fullPath, results);
    }
  }
  
  return results;
}

// Function to recursively find all route.ts files
function findAllRouteFiles(dir, results = []) {
  if (!fs.existsSync(dir)) return results;
  
  const items = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    
    if (item.isDirectory()) {
      findAllRouteFiles(fullPath, results);
    } else if (item.name === 'route.ts') {
      results.push(fullPath);
    }
  }
  
  return results;
}

// Find all dynamic route directories (those with [param] format)
const allDirs = findAllDirs(apiDir);
const dynamicDirs = allDirs.filter(dir => /^\[.+\]$/.test(dir.name));

console.log('Found dynamic route directories:');
dynamicDirs.forEach(dir => console.log(`- ${dir.name} at ${dir.path}`));

// Find all route.ts files
const routeFiles = findAllRouteFiles(apiDir);
console.log(`\nFound ${routeFiles.length} route.ts files`);

// Fix route files to use consistent parameter names
let fixedFiles = 0;
for (const routeFile of routeFiles) {
  let content = fs.readFileSync(routeFile, 'utf8');
  const originalContent = content;
  
  // Replace parameter names in route handler
  content = content.replace(
    /params: \{ (\w+): string \}/g,
    (match, paramName) => {
      if (paramName !== 'id') {
        return `params: { id: string }`;
      }
      return match;
    }
  );
  
  // Replace parameter usage
  content = content.replace(
    /params\.(\w+)(?!\w)/g,
    (match, paramName) => {
      if (paramName !== 'id') {
        return `params.id`;
      }
      return match;
    }
  );
  
  if (content !== originalContent) {
    fs.writeFileSync(routeFile, content);
    console.log(`Fixed parameter names in ${routeFile}`);
    fixedFiles++;
  }
}

console.log(`\nFixed ${fixedFiles} route files`);

// Rename dynamic directories to use [id]
for (const dir of dynamicDirs) {
  const paramName = dir.name.slice(1, -1);
  if (paramName !== 'id') {
    const parentPath = path.dirname(dir.path);
    const newDirName = '[id]';
    const newPath = path.join(parentPath, newDirName);
    
    // Check if there's already an [id] directory
    if (fs.existsSync(newPath)) {
      console.log(`\nMerging ${dir.path} into existing ${newPath}`);
      
      // Copy files from old directory to new directory
      try {
        const files = fs.readdirSync(dir.path);
        for (const file of files) {
          const oldFilePath = path.join(dir.path, file);
          const newFilePath = path.join(newPath, file);
          
          if (fs.statSync(oldFilePath).isDirectory()) {
            // If it's a directory, recursively copy
            if (!fs.existsSync(newFilePath)) {
              fs.mkdirSync(newFilePath, { recursive: true });
            }
            const subFiles = fs.readdirSync(oldFilePath);
            for (const subFile of subFiles) {
              fs.copyFileSync(
                path.join(oldFilePath, subFile),
                path.join(newFilePath, subFile)
              );
            }
          } else {
            // If it's a file, copy it
            fs.copyFileSync(oldFilePath, newFilePath);
          }
        }
        
        // Remove old directory
        fs.rmSync(dir.path, { recursive: true, force: true });
        console.log(`Removed old directory: ${dir.path}`);
      } catch (err) {
        console.error(`Error merging directories: ${err.message}`);
      }
    } else {
      console.log(`\nRenaming ${dir.path} to ${newPath}`);
      try {
        fs.renameSync(dir.path, newPath);
      } catch (err) {
        console.error(`Error renaming directory: ${err.message}`);
      }
    }
  }
}

// Update frontend components to use correct API paths
const componentsDir = path.join(__dirname, 'src', 'app', 'components');
if (fs.existsSync(componentsDir)) {
  function findTsxFiles(dir, results = []) {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory()) {
        findTsxFiles(fullPath, results);
      } else if (item.name.endsWith('.tsx')) {
        results.push(fullPath);
      }
    }
    
    return results;
  }
  
  const componentFiles = findTsxFiles(componentsDir);
  console.log(`\nFound ${componentFiles.length} component files`);
  
  let fixedComponents = 0;
  for (const file of componentFiles) {
    let content = fs.readFileSync(file, 'utf8');
    const originalContent = content;
    
    // Update API paths in string literals and template literals
    content = content.replace(
      /\/api\/users\/\${(\w+)}\/verify-document/g,
      '/api/users/${$1}/verify-document'
    );
    
    content = content.replace(
      /\/api\/users\/\${(\w+)}\/manual-verify/g,
      '/api/users/${$1}/manual-verify'
    );
    
    content = content.replace(
      /\/api\/users\/\${(\w+)}\/request-resubmission/g,
      '/api/users/${$1}/request-resubmission'
    );
    
    if (content !== originalContent) {
      fs.writeFileSync(file, content);
      console.log(`Fixed API paths in ${file}`);
      fixedComponents++;
    }
  }
  
  console.log(`Fixed ${fixedComponents} component files`);
}

// Clear Next.js cache
try {
  const nextCacheDir = path.join(__dirname, '.next');
  if (fs.existsSync(nextCacheDir)) {
    fs.rmSync(nextCacheDir, { recursive: true, force: true });
    console.log('\nCleared Next.js cache');
  }
} catch (err) {
  console.error(`Error clearing Next.js cache: ${err.message}`);
}

console.log('\nAll done! Try running "npm run dev" now.');
