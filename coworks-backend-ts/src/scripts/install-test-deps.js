#!/usr/bin/env node

/**
 * Script to install dependencies needed for API testing
 * Run with: node src/scripts/install-test-deps.js
 */

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

// Helper to print colored output
const print = {
  info: (msg) => console.log(`${colors.blue}[INFO]${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}[SUCCESS]${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}[ERROR]${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}[WARNING]${colors.reset} ${msg}`),
  header: (msg) => console.log(`\n${colors.cyan}=== ${msg} ===${colors.reset}`)
};

// Check if package.json exists
const packageJsonPath = path.resolve(__dirname, '../../package.json');
if (!fs.existsSync(packageJsonPath)) {
  print.error('package.json not found in the project root!');
  process.exit(1);
}

// Required dependencies for testing
const dependencies = ['node-fetch@2'];

// Install dependencies
async function installDependencies() {
  print.header('Installing Test Dependencies');
  
  // Check if node-fetch is already installed
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    const hasNodeFetch = packageJson.dependencies['node-fetch'] || 
                         packageJson.devDependencies['node-fetch'];
    
    if (hasNodeFetch) {
      print.info('node-fetch is already installed.');
      
      // Check version to ensure it's compatible with CommonJS require
      if (packageJson.dependencies['node-fetch']?.startsWith('^3') || 
          packageJson.devDependencies['node-fetch']?.startsWith('^3')) {
        print.warning('You have node-fetch v3+ installed, which uses ESM imports.');
        print.warning('Our test scripts use CommonJS require() statements.');
        print.info('Installing node-fetch@2 as a development dependency...');
        
        return new Promise((resolve, reject) => {
          exec('npm install node-fetch@2 --save-dev', (error, stdout, stderr) => {
            if (error) {
              print.error(`Error installing dependencies: ${error.message}`);
              return reject(error);
            }
            print.success('Successfully installed node-fetch@2');
            resolve();
          });
        });
      } else {
        print.success('Existing node-fetch version is compatible with the test scripts.');
        return Promise.resolve();
      }
    } else {
      print.info('Installing required dependencies...');
      
      return new Promise((resolve, reject) => {
        exec(`npm install ${dependencies.join(' ')} --save-dev`, (error, stdout, stderr) => {
          if (error) {
            print.error(`Error installing dependencies: ${error.message}`);
            return reject(error);
          }
          print.success('Successfully installed all required dependencies');
          resolve();
        });
      });
    }
  } catch (error) {
    print.error(`Error reading package.json: ${error.message}`);
    return Promise.reject(error);
  }
}

// Check if dotenv is installed
async function checkDotenv() {
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const hasDotenv = packageJson.dependencies['dotenv'] || 
                      packageJson.devDependencies['dotenv'];
    
    if (!hasDotenv) {
      print.warning('dotenv is not installed. Installing it...');
      return new Promise((resolve, reject) => {
        exec('npm install dotenv --save', (error, stdout, stderr) => {
          if (error) {
            print.error(`Error installing dotenv: ${error.message}`);
            return reject(error);
          }
          print.success('Successfully installed dotenv');
          resolve();
        });
      });
    } else {
      print.success('dotenv is already installed.');
      return Promise.resolve();
    }
  } catch (error) {
    print.error(`Error checking dotenv: ${error.message}`);
    return Promise.reject(error);
  }
}

// Main function
async function main() {
  try {
    print.header('Checking and Installing Test Dependencies');
    
    await checkDotenv();
    await installDependencies();
    
    print.header('All Dependencies Installed Successfully');
    print.info('You can now run the test scripts:');
    print.info('  npm run test:db     - Test database connection');
    print.info('  npm run test:profile - Test profile API endpoints');
    
  } catch (error) {
    print.error(`Failed to install dependencies: ${error.message}`);
    process.exit(1);
  }
}

// Run the main function
main(); 