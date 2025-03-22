const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

const API_DIR = path.join(__dirname, 'src', 'app', 'api');
const RUNTIME_DIRECTIVE = "// Use Node.js runtime for Sequelize compatibility\nexport const runtime = 'nodejs';\n\n";

async function findAllRouteFiles(dir) {
  const allFiles = [];
  
  async function traverseDirectory(currentDir) {
    const files = await readdir(currentDir);
    
    for (const file of files) {
      const filePath = path.join(currentDir, file);
      const stats = await stat(filePath);
      
      if (stats.isDirectory()) {
        await traverseDirectory(filePath);
      } else if (file === 'route.ts') {
        allFiles.push(filePath);
      }
    }
  }
  
  await traverseDirectory(dir);
  return allFiles;
}

async function addRuntimeDirective(filePath) {
  let content = await readFile(filePath, 'utf8');
  
  // Skip if directive already exists
  if (content.includes("export const runtime = 'nodejs'")) {
    console.log(`✓ Already has runtime directive: ${filePath}`);
    return;
  }
  
  // Add directive at the beginning
  content = RUNTIME_DIRECTIVE + content;
  await writeFile(filePath, content);
  console.log(`+ Added runtime directive to: ${filePath}`);
}

async function main() {
  try {
    console.log('Finding all route files...');
    const routeFiles = await findAllRouteFiles(API_DIR);
    console.log(`Found ${routeFiles.length} route files`);
    
    for (const file of routeFiles) {
      await addRuntimeDirective(file);
    }
    
    console.log('Complete! Runtime directive added to all API route files.');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main(); 