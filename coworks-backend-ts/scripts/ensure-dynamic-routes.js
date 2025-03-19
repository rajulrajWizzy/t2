const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);

// Directories to scan
const API_DIR = path.join(__dirname, '..', 'src', 'app', 'api');

// Find all route.ts files
async function findRouteFiles(dir, routeFiles = []) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      await findRouteFiles(filePath, routeFiles);
    } else if (file === 'route.ts') {
      routeFiles.push(filePath);
    }
  }

  return routeFiles;
}

// Check if a file uses request.url but doesn't have dynamic config
async function checkAndFixFile(filePath) {
  try {
    const content = await readFileAsync(filePath, 'utf8');

    // Check if the file uses request.url
    const usesRequestUrl = content.includes('request.url');

    // Check if the file already has dynamic config
    const hasDynamicConfig = content.includes("dynamic = 'force-dynamic'");

    if (usesRequestUrl && !hasDynamicConfig) {
      console.log(`Adding dynamic config to ${filePath}`);
      
      // Add dynamic config after the imports
      const importRegex = /^(?:import.*?;\n)+/s;
      const importMatch = content.match(importRegex);
      
      if (importMatch) {
        const updatedContent = content.replace(
          importMatch[0],
          `${importMatch[0]}\nexport const dynamic = 'force-dynamic';\n`
        );
        
        await writeFileAsync(filePath, updatedContent, 'utf8');
        return true;
      } else {
        // If no imports found, just add at the beginning
        const updatedContent = `export const dynamic = 'force-dynamic';\n\n${content}`;
        await writeFileAsync(filePath, updatedContent, 'utf8');
        return true;
      }
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
  }
  
  return false;
}

async function main() {
  try {
    console.log('Scanning for API route files...');
    const routeFiles = await findRouteFiles(API_DIR);
    console.log(`Found ${routeFiles.length} route files.`);

    let fixedCount = 0;
    for (const file of routeFiles) {
      const fixed = await checkAndFixFile(file);
      if (fixed) fixedCount++;
    }

    console.log(`Fixed ${fixedCount} route files.`);
  } catch (error) {
    console.error('Error:', error);
  }
}

main(); 