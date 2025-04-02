// Script to fix dynamic route parameters in Next.js app
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Base directory for API routes
const apiDir = path.join(__dirname, 'src', 'app', 'api');

// Function to recursively find all directories
function findAllDirs(dir, results = []) {
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

// Find all dynamic route directories (those with [param] format)
const allDirs = findAllDirs(apiDir);
const dynamicDirs = allDirs.filter(dir => /^\[.+\]$/.test(dir.name));

console.log('Found dynamic route directories:');
dynamicDirs.forEach(dir => console.log(`- ${dir.name} at ${dir.path}`));

// Check for conflicts (different parameter names in same path hierarchy)
const pathMap = new Map();

dynamicDirs.forEach(dir => {
  // Extract the parameter name without brackets
  const paramName = dir.name.slice(1, -1);
  
  // Get the parent path
  const parentPath = path.dirname(dir.path);
  
  if (!pathMap.has(parentPath)) {
    pathMap.set(parentPath, new Set());
  }
  
  pathMap.get(parentPath).add(paramName);
});

// Find conflicts
let hasConflicts = false;
for (const [parentPath, params] of pathMap.entries()) {
  if (params.size > 1) {
    console.log(`Conflict found in ${parentPath}:`);
    console.log(`  Parameters: ${Array.from(params).join(', ')}`);
    hasConflicts = true;
  }
}

if (!hasConflicts) {
  console.log('No conflicts found!');
} else {
  console.log('\nFixing conflicts by standardizing to [id]...');
  
  // Fix conflicts by renaming directories
  for (const dir of dynamicDirs) {
    const paramName = dir.name.slice(1, -1);
    if (paramName !== 'id') {
      const parentPath = path.dirname(dir.path);
      const newDirName = '[id]';
      const newPath = path.join(parentPath, newDirName);
      
      // Check if there's already an [id] directory
      if (fs.existsSync(newPath)) {
        console.log(`Merging ${dir.path} into existing ${newPath}`);
        
        // Copy files from old directory to new directory
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
      } else {
        console.log(`Renaming ${dir.path} to ${newPath}`);
        fs.renameSync(dir.path, newPath);
      }
      
      // Update route files to use 'id' parameter
      const routeFiles = findRouteFiles(newPath);
      for (const routeFile of routeFiles) {
        let content = fs.readFileSync(routeFile, 'utf8');
        // Replace parameter name in route handler
        content = content.replace(
          new RegExp(`params: \\{ ${paramName}: string \\}`, 'g'),
          `params: { id: string }`
        );
        // Replace parameter usage
        content = content.replace(
          new RegExp(`params\\.${paramName}`, 'g'),
          'params.id'
        );
        fs.writeFileSync(routeFile, content);
      }
    }
  }
  
  console.log('\nUpdating frontend components to use correct API paths...');
  updateFrontendComponents();
  
  console.log('\nAll conflicts resolved!');
}

// Function to find route.ts files in a directory
function findRouteFiles(dir, results = []) {
  const items = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      findRouteFiles(fullPath, results);
    } else if (item.name === 'route.ts') {
      results.push(fullPath);
    }
  }
  
  return results;
}

// Function to update frontend components
function updateFrontendComponents() {
  const componentsDir = path.join(__dirname, 'src', 'app', 'components');
  
  if (!fs.existsSync(componentsDir)) {
    console.log('Components directory not found');
    return;
  }
  
  const componentFiles = [];
  findTsxFiles(componentsDir, componentFiles);
  
  for (const file of componentFiles) {
    let content = fs.readFileSync(file, 'utf8');
    let modified = false;
    
    // Update API paths
    if (content.includes('/api/admin/')) {
      content = content.replace(/\/api\/admin\//g, '/api/');
      modified = true;
    }
    
    // Update dynamic parameter usage in API calls
    if (content.includes('/userId/')) {
      content = content.replace(/\/userId\//g, '/id/');
      modified = true;
    }
    
    if (modified) {
      console.log(`Updated ${file}`);
      fs.writeFileSync(file, content);
    }
  }
}

// Function to find TSX files
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

console.log('\nDone!');
