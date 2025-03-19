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

// Check if a file uses Branch models and needs attribute utility imports
async function checkAndFixFile(filePath) {
  try {
    const content = await readFileAsync(filePath, 'utf8');

    // Check if file uses Branch model
    const usesBranchModel = content.includes('model: models.Branch') || content.includes('models.Branch.find');
    
    // Check if it already imports attribute utilities
    const hasAttributeImports = content.includes('BRANCH_MINIMAL_ATTRIBUTES') 
      || content.includes('BRANCH_SAFE_ATTRIBUTES')
      || content.includes('BRANCH_FULL_ATTRIBUTES');

    // Check if it has hard-coded Branch attributes
    const hasHardcodedBranchAttributes = content.includes("attributes: ['id', 'name'") && content.includes('Branch');
      
    if (usesBranchModel && !hasAttributeImports && hasHardcodedBranchAttributes) {
      console.log(`Fixing Branch attribute usage in ${filePath}`);
      
      // Add import for attribute utilities if needed
      if (!content.includes('@/utils/modelAttributes')) {
        const importRegex = /^(?:import.*?;\n)+/s;
        const importMatch = content.match(importRegex);
        
        if (importMatch) {
          const updatedContent = content.replace(
            importMatch[0],
            `${importMatch[0]}import { BRANCH_MINIMAL_ATTRIBUTES, BRANCH_SAFE_ATTRIBUTES, BRANCH_FULL_ATTRIBUTES } from '@/utils/modelAttributes';\n\n`
          );
          
          // Replace hard-coded Branch attributes with utility constants
          const withReplacedAttributes = updatedContent
            .replace(/attributes: \[\s*'id',\s*'name',\s*'short_code'[^\]]*?\]/g, 'attributes: BRANCH_MINIMAL_ATTRIBUTES')
            .replace(/attributes: \[\s*'id',\s*'name',\s*'address',\s*'location'[^\]]*?\]/g, 'attributes: BRANCH_MINIMAL_ATTRIBUTES')
            .replace(/attributes: \[\s*'id',\s*'name',\s*'address'[^\]]*?\]/g, 'attributes: BRANCH_MINIMAL_ATTRIBUTES');
          
          await writeFileAsync(filePath, withReplacedAttributes, 'utf8');
          return true;
        }
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

    console.log(`Fixed ${fixedCount} route files with Branch attribute issues.`);
  } catch (error) {
    console.error('Error:', error);
  }
}

main(); 