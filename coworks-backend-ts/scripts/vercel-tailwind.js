const fs = require('fs');
const path = require('path');
const { execSync, exec } = require('child_process');

console.log('[Vercel Build] Starting Tailwind CSS process');
console.log('[Vercel Build] Current directory:', process.cwd());
console.log('[Vercel Build] Node version:', process.version);

// ==========================================
// Safety fallback: Create basic CSS regardless
// ==========================================
const outputDir = path.join(__dirname, '../public/css');
const outputCss = path.join(outputDir, 'tailwind.css');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
  console.log(`[Vercel Build] Created output directory: ${outputDir}`);
}

// Create a basic CSS file with essential styles
const basicCss = `
/* Basic utility classes needed for UI */
body { 
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; 
  margin: 0; 
  padding: 0;
  color: #111827;
  background: #ffffff;
}

.container { max-width: 1200px; margin: 0 auto; padding: 1rem; }

/* Layout utilities */
.flex { display: flex; }
.items-center { align-items: center; }
.justify-between { justify-content: space-between; }
.justify-center { justify-content: center; }
.grid { display: grid; }
.hidden { display: none; }

/* Spacing utilities */
.p-4 { padding: 1rem; }
.p-2 { padding: 0.5rem; }
.m-2 { margin: 0.5rem; }
.my-4 { margin-top: 1rem; margin-bottom: 1rem; }
.mt-4 { margin-top: 1rem; }
.mb-2 { margin-bottom: 0.5rem; }

/* Colors */
.text-blue-600 { color: #2563eb; }
.text-red-600 { color: #dc2626; }
.bg-white { background-color: white; }
.bg-gray-100 { background-color: #f3f4f6; }
.bg-blue-500 { background-color: #3b82f6; }

/* Typography */
.text-lg { font-size: 1.125rem; }
.text-sm { font-size: 0.875rem; }
.font-bold { font-weight: 700; }
.font-medium { font-weight: 500; }

/* Effects */
.rounded-lg { border-radius: 0.5rem; }
.rounded { border-radius: 0.25rem; }
.shadow { box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06); }
.border { border: 1px solid #e5e7eb; }

/* Components */
.btn-primary { 
  display: inline-block;
  background-color: #3b82f6; 
  color: white; 
  padding: 0.5rem 1rem; 
  border-radius: 0.25rem;
  font-weight: 500;
  cursor: pointer;
}
.btn-primary:hover { background-color: #2563eb; }

.form-input { 
  width: 100%; 
  padding: 0.5rem; 
  border: 1px solid #d1d5db; 
  border-radius: 0.25rem; 
}

/* Table styles */
.table { width: 100%; border-collapse: collapse; }
.table th, .table td { padding: 0.75rem; border-bottom: 1px solid #e5e7eb; text-align: left; }
.table th { font-weight: 500; }

/* Admin specific */
.sidebar-link { display: flex; align-items: center; padding: 0.5rem 1rem; color: #374151; }
.sidebar-link:hover { background-color: #f3f4f6; }
.sidebar-link.active { background-color: #f3f4f6; color: #3b82f6; }
.dashboard-card { background: white; padding: 1rem; border-radius: 0.5rem; border: 1px solid #e5e7eb; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
`;

// Write the basic CSS file directly first as a fallback
fs.writeFileSync(outputCss, basicCss);
console.log(`[Vercel Build] Created basic CSS file at ${outputCss}`);

// Create a backup copy in public root
const publicCss = path.join(__dirname, '../public/globals.css');
fs.writeFileSync(publicCss, basicCss);
console.log(`[Vercel Build] Created backup globals.css at ${publicCss}`);

// Verify if tailwindcss module and binary exist by direct path check
const tailwindBinaryPath = path.join(__dirname, '../node_modules/.bin/tailwindcss');
const hasTailwindBinary = fs.existsSync(tailwindBinaryPath);

// Also check if module exists in node_modules
const tailwindModulePath = path.join(__dirname, '../node_modules/tailwindcss');
const hasTailwindModule = fs.existsSync(tailwindModulePath);

console.log(`[Vercel Build] TailwindCSS binary exists: ${hasTailwindBinary}`);
console.log(`[Vercel Build] TailwindCSS module exists: ${hasTailwindModule}`);

// Define paths
const inputCss = path.join(__dirname, '../src/app/globals.css');
const configPath = path.join(__dirname, '../tailwind.config.js');

// Ensure tailwind config exists
if (!fs.existsSync(configPath)) {
  console.log('[Vercel Build] Tailwind config not found, creating minimal config...');
  
  const minimalConfig = `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx}",
    "./src/pages/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}`;
  
  fs.writeFileSync(configPath, minimalConfig);
  console.log(`[Vercel Build] Created minimal Tailwind config at ${configPath}`);
}

// Try to run Tailwind compilation
try {
  if (hasTailwindModule) {
    console.log('[Vercel Build] Found tailwindcss module, attempting compilation');
    
    let command;
    
    // Try multiple approaches to find a working command
    if (hasTailwindBinary) {
      // Use direct path to binary (most reliable)
      command = `"${tailwindBinaryPath}" -i "${inputCss}" -o "${outputCss}" --minify`;
    } else {
      // Try to find tailwind CLI in the node_modules
      try {
        const tailwindCliPath = path.join(tailwindModulePath, 'lib/cli.js');
        if (fs.existsSync(tailwindCliPath)) {
          command = `node "${tailwindCliPath}" -i "${inputCss}" -o "${outputCss}" --minify`;
        } else {
          throw new Error('Tailwind CLI not found in expected location');
        }
      } catch (err) {
        console.error('[Vercel Build] Error locating Tailwind CLI:', err.message);
        console.log('[Vercel Build] Will try npx as a last resort');
        command = `npx tailwindcss -i "${inputCss}" -o "${outputCss}" --minify`;
      }
    }
    
    console.log(`[Vercel Build] Running command: ${command}`);
    
    try {
      execSync(command, { stdio: 'inherit' });
      console.log(`[Vercel Build] Tailwind CSS compiled successfully to ${outputCss}`);
    } catch (execError) {
      console.error('[Vercel Build] Error executing Tailwind command:', execError.message);
      console.log('[Vercel Build] Continuing with basic CSS fallback');
    }
  } else {
    console.log('[Vercel Build] Tailwindcss module not found, using basic CSS fallback');
    console.log('[Vercel Build] You may need to install tailwindcss, postcss, and autoprefixer as dependencies (not devDependencies)');
  }
} catch (error) {
  console.error('[Vercel Build] Error during Tailwind processing:', error.message);
  console.log('[Vercel Build] Using basic CSS fallback');
}

console.log('[Vercel Build] CSS preparation complete, continuing with build');
// Always exit with success to not block the build
process.exit(0); 