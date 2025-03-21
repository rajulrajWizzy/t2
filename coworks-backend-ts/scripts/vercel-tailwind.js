const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Starting Vercel Tailwind CSS compilation...');

// Ensure output directory exists
const outputDir = path.join(process.cwd(), 'public');
if (!fs.existsSync(outputDir)) {
  console.log('📁 Creating public directory...');
  fs.mkdirSync(outputDir, { recursive: true });
}

// Check if tailwindcss is installed
try {
  console.log('🔍 Checking Tailwind CSS installation...');
  const tailwindVersion = execSync('npx tailwindcss --version').toString().trim();
  console.log(`✅ Tailwind CSS is installed: ${tailwindVersion}`);
} catch (error) {
  console.error('❌ Tailwind CSS not found, installing...');
  execSync('npm install --save-dev tailwindcss@latest autoprefixer@latest postcss@latest');
  console.log('✅ Tailwind CSS installed successfully');
}

// Run tailwind build
try {
  console.log('🔨 Building Tailwind CSS...');
  execSync('npx tailwindcss -i ./src/app/globals.css -o ./public/output.css');
  console.log('✅ Tailwind CSS compiled successfully');
} catch (error) {
  console.error('❌ Error compiling Tailwind CSS:', error.message);
  process.exit(1);
}

console.log('✨ Vercel Tailwind CSS compilation complete!'); 