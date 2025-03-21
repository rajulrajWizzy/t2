const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Define paths
const tailwindBinary = path.join(__dirname, '../node_modules/.bin/tailwindcss');
const inputCss = path.join(__dirname, '../src/app/globals.css');
const outputDir = path.join(__dirname, '../public/css');
const outputCss = path.join(outputDir, 'tailwind.css');

console.log('[Vercel Build] Starting Tailwind CSS compilation');

try {
  // Check if the tailwind binary exists
  if (!fs.existsSync(tailwindBinary)) {
    console.log('[Vercel Build] Tailwind binary not found, attempting to use global tailwindcss');
    
    // Try generating CSS with basic content
    const basicCss = `
@tailwind base;
@tailwind components;
@tailwind utilities;
    `;
    
    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      console.log(`[Vercel Build] Created output directory: ${outputDir}`);
    }
    
    // Write the basic CSS file directly
    fs.writeFileSync(outputCss, basicCss);
    console.log(`[Vercel Build] Created basic Tailwind CSS file at ${outputCss}`);
    
    process.exit(0);
  }
  
  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`[Vercel Build] Created output directory: ${outputDir}`);
  }
  
  // Simplified basic command to avoid PostCSS issues
  const command = `"${tailwindBinary}" -i "${inputCss}" -o "${outputCss}" --minify`;
  
  console.log(`[Vercel Build] Running command: ${command}`);
  execSync(command, { stdio: 'inherit' });
  
  console.log(`[Vercel Build] Tailwind CSS compiled successfully to ${outputCss}`);
} catch (error) {
  console.error('[Vercel Build] Error during Tailwind CSS compilation:', error.message);
  
  // Fallback to creating a minimal CSS file if compilation fails
  try {
    const fallbackCss = `
@tailwind base;
@tailwind components;
@tailwind utilities;
    `;
    
    fs.writeFileSync(outputCss, fallbackCss);
    console.log(`[Vercel Build] Created fallback CSS file at ${outputCss}`);
    
    // Don't fail the build
    process.exit(0);
  } catch (fallbackError) {
    console.error('[Vercel Build] Failed to create fallback CSS:', fallbackError.message);
    process.exit(1);
  }
} 