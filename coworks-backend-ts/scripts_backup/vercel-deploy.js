#!/usr/bin/env node

/**
 * vercel-deploy.js
 * 
 * This script is designed to run during the Vercel deployment process.
 * It handles all database migrations and setup tasks.
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}[vercel-deploy] ${message}${colors.reset}`);
}

function logError(message) {
  console.error(`${colors.red}[vercel-deploy] ERROR: ${message}${colors.reset}`);
}

function hasDatabaseConfig() {
  return !!process.env.DATABASE_URL || 
         (process.env.DB_HOST && process.env.DB_NAME && process.env.DB_USER);
}

async function runMigrations() {
  log('Starting database setup for Vercel deployment...', colors.bright + colors.cyan);
  
  if (!hasDatabaseConfig()) {
    logError('No database configuration found. Cannot proceed with migrations.');
    return;
  }

  try {
    log('Running main database migrations...', colors.green);
    try {
      require('./migrate');
      log('Main migrations completed successfully.', colors.green);
    } catch (err) {
      logError(`Main migrations failed: ${err.message}`);
    }
    
    log('Running customer profile migrations...', colors.green);
    try {
      require('./migrate-customer-profile-fields');
      log('Customer profile migrations completed successfully.', colors.green);
    } catch (err) {
      logError(`Customer profile migrations failed: ${err.message}`);
    }
    
    log('Database deployment completed successfully.', colors.bright + colors.green);
  } catch (error) {
    logError(`Database deployment failed: ${error.message}`);
    process.exit(1);
  }
}

// Run the migrations
runMigrations().catch(err => {
  logError(`Uncaught error in deployment script: ${err.message}`);
  process.exit(1);
}); 