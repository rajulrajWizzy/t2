#!/usr/bin/env node

/**
 * Debug Build Script
 * 
 * This script helps troubleshoot common build issues by checking:
 * 1. Node version compatibility
 * 2. Package versions
 * 3. File existence
 * 4. Configuration validity
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const chalk = require('chalk') || { green: (t) => t, red: (t) => t, yellow: (t) => t, blue: (t) => t };

console.log(chalk.blue('=== CoWorks Debug Build Script ==='));

// Check Node version
const nodeVersion = process.version;
console.log(`Node version: ${nodeVersion}`);
if (!nodeVersion.startsWith('v18')) {
  console.log(chalk.yellow('Warning: Recommended Node version is v18.x'));
}

// Check for critical files
const criticalFiles = [
  'next.config.js',
  'vercel.json',
  '.nvmrc',
  'package.json',
  'src/app/layout.tsx',
  'src/app/page.tsx'
];

console.log(chalk.blue('\nChecking for critical files:'));
criticalFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(chalk.green(`✓ ${file} exists`));
  } else {
    console.log(chalk.red(`✗ ${file} missing`));
  }
});

// Check package.json
console.log(chalk.blue('\nAnalyzing package.json:'));
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  // Check engines
  if (packageJson.engines && packageJson.engines.node) {
    console.log(chalk.green(`✓ Node engine: ${packageJson.engines.node}`));
  } else {
    console.log(chalk.red('✗ No Node engine specified in package.json'));
  }
  
  // Check scripts
  const requiredScripts = ['build', 'start', 'dev'];
  requiredScripts.forEach(script => {
    if (packageJson.scripts && packageJson.scripts[script]) {
      console.log(chalk.green(`✓ Script "${script}" exists: ${packageJson.scripts[script]}`));
    } else {
      console.log(chalk.red(`✗ Script "${script}" missing`));
    }
  });
  
  // Check dependencies
  const criticalDeps = ['next', 'react', 'react-dom', 'sequelize', 'pg'];
  criticalDeps.forEach(dep => {
    if (packageJson.dependencies && packageJson.dependencies[dep]) {
      console.log(chalk.green(`✓ Dependency ${dep}: ${packageJson.dependencies[dep]}`));
    } else {
      console.log(chalk.red(`✗ Dependency ${dep} missing`));
    }
  });
} catch (error) {
  console.log(chalk.red('Error parsing package.json:', error.message));
}

// Check next.config.js
console.log(chalk.blue('\nAnalyzing next.config.js:'));
try {
  if (fs.existsSync('next.config.js')) {
    const nextConfig = fs.readFileSync('next.config.js', 'utf8');
    if (nextConfig.includes('ignoreBuildErrors')) {
      console.log(chalk.green('✓ TypeScript errors are being ignored during build'));
    } else {
      console.log(chalk.yellow('! TypeScript errors may cause build failures'));
    }
    
    if (nextConfig.includes('ignoreDuringBuilds')) {
      console.log(chalk.green('✓ ESLint errors are being ignored during build'));
    } else {
      console.log(chalk.yellow('! ESLint errors may cause build failures'));
    }
    
    if (nextConfig.includes('standalone')) {
      console.log(chalk.green('✓ Using standalone output for better Vercel compatibility'));
    } else {
      console.log(chalk.yellow('! Not using standalone output, which might affect Vercel deployment'));
    }
  }
} catch (error) {
  console.log(chalk.red('Error analyzing next.config.js:', error.message));
}

// Check database configuration
console.log(chalk.blue('\nChecking database configuration:'));
if (process.env.DATABASE_URL) {
  console.log(chalk.green('✓ DATABASE_URL is set'));
} else {
  console.log(chalk.red('✗ DATABASE_URL is not set'));
}

// Check disk space
console.log(chalk.blue('\nChecking disk space:'));
try {
  const dfOutput = execSync('df -h .').toString();
  console.log(dfOutput);
} catch (error) {
  console.log(chalk.yellow('Unable to check disk space:', error.message));
}

// Check memory
console.log(chalk.blue('\nChecking memory:'));
try {
  const memInfo = execSync('free -m').toString();
  console.log(memInfo);
} catch (error) {
  console.log(chalk.yellow('Unable to check memory:', error.message));
}

// Run a trial build (with limited output)
console.log(chalk.blue('\nRunning a trial build preparation:'));
try {
  console.log('This might take a minute...');
  execSync('npm run build -- --no-lint', { stdio: 'pipe' });
  console.log(chalk.green('✓ Trial build preparation completed successfully'));
} catch (error) {
  console.log(chalk.red('✗ Trial build preparation failed'));
  console.log('Build error summary:', error.message.split('\n').slice(0, 5).join('\n'));
}

console.log(chalk.blue('\n=== Debug Build Complete ==='));
console.log('If you continue to experience issues, please check the deployment guide in DEPLOYMENT.md'); 