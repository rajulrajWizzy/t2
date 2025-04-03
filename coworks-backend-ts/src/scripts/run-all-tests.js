#!/usr/bin/env node

/**
 * Script to run all test scripts in sequence
 * Run with: node src/scripts/run-all-tests.js
 */

const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  reset: '\x1b[0m'
};

// Helper to print colored output
const print = {
  info: (msg) => console.log(`${colors.blue}[INFO]${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}[SUCCESS]${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}[ERROR]${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}[WARNING]${colors.reset} ${msg}`),
  header: (msg) => console.log(`\n${colors.cyan}=== ${msg} ===${colors.reset}`),
  test: (msg) => console.log(`${colors.magenta}[TEST]${colors.reset} ${msg}`)
};

// Run a command and return a Promise
function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    print.info(`Running: ${command} ${args.join(' ')}`);
    
    const cmd = spawn(command, args, {
      stdio: 'inherit',
      shell: process.platform === 'win32'
    });
    
    cmd.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command exited with code ${code}`));
      }
    });
    
    cmd.on('error', (err) => {
      reject(err);
    });
  });
}

// Run npm script
function runNpmScript(scriptName) {
  print.header(`Running ${scriptName}`);
  return runCommand('npm', ['run', scriptName]);
}

// Main function
async function main() {
  const startTime = Date.now();
  
  try {
    print.header('Starting Test Suite');
    
    // Install dependencies if needed
    print.test('Installing test dependencies');
    await runNpmScript('setup:test-deps');
    
    // Run database connection test
    print.test('Testing database connection');
    await runNpmScript('test:db');
    
    // Run profile API test
    print.test('Testing profile API');
    await runNpmScript('test:profile');
    
    // Check if admin API test script exists
    const adminTestPath = path.resolve(__dirname, '../../admin-api-test.sh');
    if (fs.existsSync(adminTestPath)) {
      print.test('Running admin API tests');
      await runCommand('bash', [adminTestPath]);
    } else {
      print.warning('Admin API test script not found, skipping');
    }
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    print.header(`All Tests Completed in ${duration}s`);
    print.success('Test suite ran successfully!');
    
  } catch (error) {
    print.error(`Test suite failed: ${error.message}`);
    process.exit(1);
  }
}

// Run the main function
main(); 