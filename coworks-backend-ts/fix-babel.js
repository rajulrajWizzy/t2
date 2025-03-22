#!/usr/bin/env node

/**
 * Babel Fix Script
 * 
 * This script ensures Babel configuration is properly set up for Next.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Fixing Babel configuration...');

// Check if required dependencies are installed
try {
  const missingDeps = [];
  const requiredDeps = [
    '@babel/plugin-transform-typescript',
    '@babel/plugin-transform-private-methods',
    '@babel/plugin-transform-class-properties'
  ];
  
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const allDeps = { 
      ...packageJson.dependencies || {}, 
      ...packageJson.devDependencies || {} 
    };
    
    for (const dep of requiredDeps) {
      if (!allDeps[dep]) {
        missingDeps.push(dep);
      }
    }
  } catch (error) {
    console.error('Error reading package.json:', error.message);
  }
  
  if (missingDeps.length > 0) {
    console.log(`Installing missing dependencies: ${missingDeps.join(', ')}...`);
    execSync(`npm install --save-dev ${missingDeps.join(' ')}`, { stdio: 'inherit' });
    console.log('Dependencies installed successfully!');
  }
  
  // Update or create .babelrc
  const babelConfig = {
    "presets": [
      ["next/babel", {
        "preset-env": {},
        "transform-runtime": {},
        "styled-jsx": {},
        "class-properties": {}
      }]
    ],
    "plugins": [
      "@babel/plugin-transform-typescript",
      "@babel/plugin-transform-private-methods",
      "@babel/plugin-transform-class-properties"
    ]
  };
  
  fs.writeFileSync('.babelrc', JSON.stringify(babelConfig, null, 2));
  console.log('.babelrc updated successfully!');
  
  // Create a babel.config.js file as an alternative approach
  const babelConfigJS = `module.exports = {
  presets: [
    ["next/babel", {
      "preset-env": {},
      "transform-runtime": {},
      "styled-jsx": {},
      "class-properties": {}
    }]
  ],
  plugins: [
    "@babel/plugin-transform-typescript",
    "@babel/plugin-transform-private-methods",
    "@babel/plugin-transform-class-properties"
  ]
};
`;
  
  fs.writeFileSync('babel.config.js', babelConfigJS);
  console.log('babel.config.js created as a backup!');
  
  console.log('Babel configuration fixed successfully!');
} catch (error) {
  console.error('Error fixing Babel configuration:', error.message);
  process.exit(1);
} 