/**
 * Uploads Directory Creator
 * 
 * This utility script creates the required directories for file uploads
 * in the project. It ensures all necessary subdirectories exist.
 * 
 * Usage:
 *   node scripts/create-uploads-dir.js
 *   or
 *   npm run create-uploads-dir
 */

const fs = require('fs');
const path = require('path');

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

// Helper function for logging
function log(message, color = colors.reset) {
  console.log(`${color}[create-uploads-dir] ${message}${colors.reset}`);
}

// Define base uploads directory
const baseUploadsDir = path.join(__dirname, '..', 'uploads');

// Define subdirectories for different types of uploads
const subdirectories = [
  'profile', // User profile images
  'branches', // Branch images
  'seating', // Seating images
  'temp', // Temporary files
  'attachments', // General attachments
  'thumbnails' // Thumbnail images
];

// Create directory if it doesn't exist
function createDirectoryIfNotExists(dir) {
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
      log(`Created directory: ${dir}`, colors.green);
      return true;
    } catch (error) {
      log(`Error creating directory ${dir}: ${error.message}`, colors.red);
      return false;
    }
  } else {
    log(`Directory already exists: ${dir}`, colors.yellow);
    return true;
  }
}

// Main function
function main() {
  // Create the base uploads directory if it doesn't exist
  const baseCreated = createDirectoryIfNotExists(baseUploadsDir);
  if (!baseCreated) {
    log('Failed to create base uploads directory. Exiting.', colors.red);
    process.exit(1);
  }
  
  // Create each subdirectory
  let allSuccess = true;
  subdirectories.forEach(subdir => {
    const fullPath = path.join(baseUploadsDir, subdir);
    const success = createDirectoryIfNotExists(fullPath);
    if (!success) {
      allSuccess = false;
    }
  });
  
  if (allSuccess) {
    log('All directories created successfully.', colors.bright + colors.green);
  } else {
    log('Some directories could not be created. Check the logs above.', colors.yellow);
    process.exit(1);
  }
}

// Run the main function
main(); 