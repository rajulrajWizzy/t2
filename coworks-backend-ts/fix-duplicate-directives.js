const fs = require('fs');
const path = require('path');
const glob = require('glob');

console.log('🔧 Fixing duplicate directives in route files...');

// Find all route files
const routeFiles = glob.sync('src/app/api/**/route.ts');
console.log(`Found ${routeFiles.length} route files to check`);

let fixedCount = 0;

// Process each file
routeFiles.forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Check for duplicate directives
  const runtimeCount = (content.match(/export const runtime/g) || []).length;
  const dynamicCount = (content.match(/export const dynamic/g) || []).length;
  const fetchCacheCount = (content.match(/export const fetchCache/g) || []).length;
  
  if (runtimeCount > 1 || dynamicCount > 1 || fetchCacheCount > 1) {
    console.log(`Found duplicate directives in ${filePath}`);
    
    // Process the content line by line
    const lines = content.split('\n');
    let processedLines = [];
    let addedRuntime = false;
    let addedDynamic = false;
    let addedFetchCache = false;
    let skipNext = false;
    
    // Process each line
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (skipNext) {
        skipNext = false;
        continue;
      }
      
      // Skip directive lines
      if (line.includes('export const runtime')) {
        if (!addedRuntime) {
          processedLines.push('export const runtime = "nodejs";');
          addedRuntime = true;
        }
        continue;
      }
      
      if (line.includes('export const dynamic')) {
        if (!addedDynamic) {
          processedLines.push('export const dynamic = "force-dynamic";');
          addedDynamic = true;
        }
        continue;
      }
      
      if (line.includes('export const fetchCache')) {
        if (!addedFetchCache) {
          processedLines.push('export const fetchCache = "force-no-store";');
          addedFetchCache = true;
        }
        continue;
      }
      
      // Skip comment lines for directives
      if (line.includes('// Explicitly set Node.js runtime') || 
          line.includes('// Properly configured Next.js API route directives')) {
        continue;
      }
      
      // Include all other lines
      processedLines.push(line);
    }
    
    // Add any missing directives at the top
    let directivesHeader = '// Explicitly set Node.js runtime for this route\n';
    let directives = [];
    
    if (!addedRuntime) {
      directives.push('export const runtime = "nodejs";');
    }
    
    if (!addedDynamic) {
      directives.push('export const dynamic = "force-dynamic";');
    }
    
    if (!addedFetchCache) {
      directives.push('export const fetchCache = "force-no-store";');
    }
    
    // Combine all directives
    const newContent = directivesHeader + directives.join('\n') + '\n\n' + processedLines.join('\n');
    
    fs.writeFileSync(filePath, newContent);
    fixedCount++;
    console.log(`✅ Fixed ${filePath}`);
  }
});

console.log(`✅ Fixed ${fixedCount} route files with duplicate directives`);
console.log('Done!'); 