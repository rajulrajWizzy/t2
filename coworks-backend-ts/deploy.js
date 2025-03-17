// deploy.js
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Function to run a command and log output
function runCommand(command) {
  console.log(`Running: ${command}`);
  try {
    const output = execSync(command, { encoding: 'utf8' });
    console.log(output);
    return output;
  } catch (error) {
    console.error(`Error executing command: ${command}`);
    console.error(error.stdout);
    console.error(error.stderr);
    throw error;
  }
}

// Main function
async function deploy() {
  try {
    // 1. Install dependencies
    console.log('Installing dependencies...');
    runCommand('npm install');
    
    // 2. Install TypeScript explicitly
    console.log('Installing TypeScript...');
    runCommand('npm install typescript --save');

    // 3. Run migrations
    console.log('Running database migrations...');
    runCommand('node migrate.js');

    // 4. Build the application
    console.log('Building the application...');
    runCommand('npm run build');

    // 5. Deploy to Vercel (if vercel CLI is installed)
    console.log('Deploying to Vercel...');
    runCommand('vercel --prod');

    console.log('Deployment completed successfully!');
  } catch (error) {
    console.error('Deployment failed:', error);
    process.exit(1);
  }
}

// Run the deployment
deploy(); 