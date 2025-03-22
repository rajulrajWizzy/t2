#!/usr/bin/env node

/**
 * Font Fix Script
 * 
 * This script finds and replaces next/font imports with standard CSS approaches
 * to avoid conflicts with Babel configuration
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Fixing font imports to avoid SWC conflicts...');

// List of possible font files
const fontPaths = [
  'src/app/layout.tsx',
  'src/app/page.tsx',
  'src/components/layout.tsx'
];

// Process each file
fontPaths.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    console.log(`Processing ${filePath}...`);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if file contains next/font imports
    if (content.includes('next/font')) {
      // Replace Inter font
      if (content.includes('next/font/google') && content.includes('Inter')) {
        console.log(`- Replacing Inter font in ${filePath}`);
        
        // Replace import statement
        content = content.replace(
          /import\s+.*\s+from\s+['"]next\/font\/google['"]/g, 
          '// Font import removed to avoid SWC conflict'
        );
        
        // Replace font initialization
        content = content.replace(
          /const\s+\w+\s*=\s*Inter\s*\(\s*\{[^}]*\}\s*\);/g,
          'const interFontClass = "font-inter";'
        );
        
        // Replace font className usage
        content = content.replace(
          /\$\{(\w+)\.className\}/g,
          '${interFontClass}'
        );
        
        // Add CSS link if it doesn't exist
        if (!content.includes('fonts.googleapis.com/css2?family=Inter')) {
          const headCloseIndex = content.indexOf('</head>');
          if (headCloseIndex !== -1) {
            const linkTag = `  <link 
    rel="stylesheet"
    href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
  />\n  `;
            content = content.slice(0, headCloseIndex) + linkTag + content.slice(headCloseIndex);
          }
        }
      }
      
      // Similar replacements for other fonts could be added here
      
      // Write the modified content back to the file
      fs.writeFileSync(filePath, content);
      console.log(`Successfully updated ${filePath}`);
    } else {
      console.log(`No font imports found in ${filePath}`);
    }
  }
});

console.log('Font fixes completed!');

// Add the font-inter class to globals.css if it doesn't exist
const globalsCssPath = 'src/app/globals.css';
if (fs.existsSync(globalsCssPath)) {
  console.log('Updating globals.css...');
  let cssContent = fs.readFileSync(globalsCssPath, 'utf8');
  
  if (!cssContent.includes('.font-inter')) {
    const fontInterClass = `
/* Added by fix-fonts.js */
.font-inter {
  font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}
`;
    cssContent += fontInterClass;
    fs.writeFileSync(globalsCssPath, cssContent);
    console.log('Added font-inter class to globals.css');
  }
}

console.log('Font fixing completed successfully!'); 