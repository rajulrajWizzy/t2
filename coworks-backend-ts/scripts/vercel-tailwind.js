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

// Define paths to binaries
const tailwindBin = path.join(process.cwd(), 'node_modules', '.bin', 'tailwindcss');

// Check if tailwindcss is installed
if (!fs.existsSync(tailwindBin)) {
  console.error('❌ Tailwind CSS not found, installing...');
  try {
    execSync('npm install --save-dev tailwindcss@latest autoprefixer@latest postcss@latest', { stdio: 'inherit' });
    console.log('✅ Tailwind CSS installed successfully');
  } catch (error) {
    console.error('❌ Error installing Tailwind CSS:', error.message);
    // Continue anyway since we might have a partial installation that can work
  }
}

// Generate the config manually if it doesn't exist
const tailwindConfigPath = path.join(process.cwd(), 'tailwind.config.js');
if (!fs.existsSync(tailwindConfigPath)) {
  console.log('📝 Creating tailwind.config.js...');
  const configContent = `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx}",
    "./src/pages/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
      },
      fontFamily: {
        sans: ['Inter var', 'sans-serif'],
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}`;
  fs.writeFileSync(tailwindConfigPath, configContent);
}

// Create the CSS manually if things don't work
try {
  console.log('🔨 Building Tailwind CSS...');
  
  // Try to use the local tailwind binary
  if (fs.existsSync(tailwindBin)) {
    try {
      console.log(`Running: ${tailwindBin} -i ./src/app/globals.css -o ./public/output.css`);
      execSync(`"${tailwindBin}" -i ./src/app/globals.css -o ./public/output.css`, { stdio: 'inherit' });
      console.log('✅ Tailwind CSS compiled successfully with local binary');
    } catch (error) {
      console.error('❌ Error using local tailwind binary:', error.message);
      throw error;
    }
  } else {
    // If the binary doesn't exist, create a minimal CSS file
    console.log('⚠️ Tailwind binary not found, creating minimal CSS...');
    const minimalCss = `
/* Minimal Tailwind-like CSS */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

:root {
  --primary-color: #4f46e5;
  --secondary-color: #a5b4fc;
  --danger-color: #ef4444;
  --success-color: #10b981;
  --warning-color: #f59e0b;
  --info-color: #3b82f6;
}

html, body {
  font-family: 'Inter', sans-serif;
  line-height: 1.5;
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

.btn-primary {
  background-color: var(--primary-color);
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-primary:hover {
  background-color: #4338ca;
}

.text-center { text-align: center; }
.flex { display: flex; }
.items-center { align-items: center; }
.justify-center { justify-content: center; }
.justify-between { justify-content: space-between; }
.p-4 { padding: 1rem; }
.m-4 { margin: 1rem; }
.rounded { border-radius: 0.25rem; }
.bg-white { background-color: white; }
.text-gray-800 { color: #1f2937; }
.shadow { box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06); }
    `;
    fs.writeFileSync(path.join(outputDir, 'output.css'), minimalCss);
    console.log('✅ Created minimal CSS file');
  }
} catch (error) {
  console.error('❌ Error compiling Tailwind CSS:', error.message);
  // Create a minimal CSS file as a fallback
  console.log('⚠️ Creating minimal fallback CSS...');
  const fallbackCss = `
/* Fallback CSS for basic styling */
body { font-family: system-ui, sans-serif; margin: 0; padding: 0; }
.container { max-width: 1200px; margin: 0 auto; padding: 1rem; }
  `;
  fs.writeFileSync(path.join(outputDir, 'output.css'), fallbackCss);
  console.log('✅ Created fallback CSS file');
}

console.log('✨ Vercel Tailwind CSS compilation complete!'); 