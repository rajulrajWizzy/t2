const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 Build Debug Script - Starting diagnostics');

// Display environment info
console.log('\n📋 Environment Information:');
console.log('Node.js version:', process.version);
console.log('Platform:', process.platform);
console.log('Architecture:', process.arch);
console.log('Current directory:', process.cwd());

// Check for critical files
console.log('\n📋 Checking for critical files:');
const criticalFiles = [
  'package.json',
  'next.config.js',
  'next.config.mjs',
  'src/app/layout.tsx',
  '.babelrc',
  'vercel.json',
  'tsconfig.json'
];

criticalFiles.forEach(file => {
  const exists = fs.existsSync(path.join(process.cwd(), file));
  console.log(`- ${file}: ${exists ? '✅ Found' : '❌ Not found'}`);
  
  if (exists && file.endsWith('.json')) {
    try {
      // Validate JSON files
      const content = fs.readFileSync(path.join(process.cwd(), file), 'utf8');
      JSON.parse(content);
      console.log(`  - Valid JSON: ✅`);
    } catch (error) {
      console.log(`  - Invalid JSON: ❌ Error: ${error.message}`);
    }
  }
});

// Check for dependencies
console.log('\n📋 Checking package.json dependencies:');
try {
  const packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
  
  const criticalDeps = ['next', 'react', 'react-dom', 'sequelize', 'date-fns'];
  criticalDeps.forEach(dep => {
    console.log(`- ${dep}: ${packageJson.dependencies[dep] || 'Not installed'}`);
  });
  
  // Check scripts
  console.log('\n📋 Build scripts:');
  console.log('- build:', packageJson.scripts.build || 'Not defined');
  console.log('- vercel-build:', packageJson.scripts['vercel-build'] || 'Not defined');
} catch (error) {
  console.log('❌ Error parsing package.json:', error.message);
}

// Print first few lines of next.config.js/mjs
console.log('\n📋 Next.js configuration:');
['next.config.js', 'next.config.mjs'].forEach(configFile => {
  const configPath = path.join(process.cwd(), configFile);
  if (fs.existsSync(configPath)) {
    const content = fs.readFileSync(configPath, 'utf8');
    const lines = content.split('\n').slice(0, 10).join('\n');
    console.log(`\n${configFile} (first 10 lines):\n${lines}\n...`);
  }
});

// Check for Sequelize models
console.log('\n📋 Checking Sequelize models:');
const modelsDir = path.join(process.cwd(), 'src', 'models');
if (fs.existsSync(modelsDir)) {
  const modelFiles = fs.readdirSync(modelsDir)
    .filter(file => file.endsWith('.ts') || file.endsWith('.js'));
  console.log(`Found ${modelFiles.length} model files:`, modelFiles);
} else {
  console.log('❌ Models directory not found');
}

// Check for API routes
console.log('\n📋 Checking API routes:');
const apiDir = path.join(process.cwd(), 'src', 'app', 'api');
if (fs.existsSync(apiDir)) {
  function countRoutesInDir(dir) {
    let count = 0;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        count += countRoutesInDir(fullPath);
      } else if (entry.name === 'route.ts' || entry.name === 'route.js') {
        count++;
      }
    }
    
    return count;
  }
  
  const routeCount = countRoutesInDir(apiDir);
  console.log(`Found ${routeCount} API routes`);
} else {
  console.log('❌ API directory not found');
}

// Try to identify issues with layout.tsx
console.log('\n📋 Checking layout.tsx:');
const layoutPath = path.join(process.cwd(), 'src', 'app', 'layout.tsx');
if (fs.existsSync(layoutPath)) {
  const content = fs.readFileSync(layoutPath, 'utf8');
  
  // Check for common issues
  const hasUseClient = content.includes("'use client'") || content.includes('"use client"');
  const hasMetadata = content.includes('export const metadata');
  
  console.log('- Has "use client" directive:', hasUseClient ? '⚠️ Yes' : '✅ No');
  console.log('- Has metadata export:', hasMetadata ? '✅ Yes' : 'No');
  
  if (hasUseClient && hasMetadata) {
    console.log('❌ Error: layout.tsx has both "use client" and metadata export which causes conflicts');
  }
} else {
  console.log('❌ layout.tsx not found');
}

// Try running next build with diagnostics
console.log('\n📋 Attempting test build with diagnostics...');
try {
  execSync('npx next build --debug', { stdio: 'inherit' });
  console.log('✅ Build completed successfully');
} catch (error) {
  console.log('❌ Build failed with error code:', error.status);
}

console.log('\n🔍 Build Debug Script - Diagnostics complete'); 