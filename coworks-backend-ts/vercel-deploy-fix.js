const fs = require('fs');
const path = require('path');

console.log('Running Vercel deployment fix script...');

// Fix for date-fns compatibility issue
try {
  console.log('Checking package.json for date-fns version...');
  const packageJsonPath = path.join(__dirname, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  // If date-fns is version 4.x, downgrade to 2.30.0
  if (packageJson.dependencies['date-fns'] && packageJson.dependencies['date-fns'].startsWith('^4.')) {
    console.log('Found date-fns v4, downgrading to v2.30.0 for compatibility...');
    packageJson.dependencies['date-fns'] = '2.30.0';
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log('Updated package.json with date-fns v2.30.0');
  }
} catch (error) {
  console.error('Error updating package.json:', error);
}

// Fix for Edge Runtime issues
try {
  console.log('Ensuring middleware runs in Node.js runtime...');
  const middlewareConfigPath = path.join(__dirname, 'middleware.config.js');
  const middlewareConfig = `module.exports = {
  // Use Node.js environment instead of Edge runtime for middleware
  // This is needed for Sequelize compatibility
  runtime: 'nodejs'
};`;
  fs.writeFileSync(middlewareConfigPath, middlewareConfig);
  console.log('Created middleware.config.js to use Node.js runtime');
} catch (error) {
  console.error('Error creating middleware.config.js:', error);
}

// Update next.config.js to disable Edge Runtime
try {
  console.log('Updating Next.js config to disable Edge Runtime...');
  const nextConfigPath = path.join(__dirname, 'next.config.mjs');
  
  if (fs.existsSync(nextConfigPath)) {
    let nextConfig = fs.readFileSync(nextConfigPath, 'utf8');
    
    // Add disableEdgeRuntime if not present
    if (!nextConfig.includes('disableEdgeRuntime')) {
      nextConfig = nextConfig.replace(
        /experimental:\s*{([^}]*)}/,
        'experimental: {$1, runtime: "nodejs", disableEdgeRuntime: true}'
      );
      fs.writeFileSync(nextConfigPath, nextConfig);
      console.log('Updated next.config.mjs to disable Edge Runtime');
    }
  }
} catch (error) {
  console.error('Error updating next.config.mjs:', error);
}

// Remove 'use client' from layout.tsx if present
try {
  console.log('Checking layout.tsx for client directive...');
  const layoutPath = path.join(__dirname, 'src', 'app', 'layout.tsx');
  
  if (fs.existsSync(layoutPath)) {
    let layoutContent = fs.readFileSync(layoutPath, 'utf8');
    
    // Remove 'use client' directive if present
    if (layoutContent.includes('\'use client\'')) {
      layoutContent = layoutContent.replace('\'use client\';', '');
      fs.writeFileSync(layoutPath, layoutContent);
      console.log('Removed \'use client\' directive from layout.tsx');
    }
  }
} catch (error) {
  console.error('Error updating layout.tsx:', error);
}

console.log('Vercel deployment fix script completed.'); 