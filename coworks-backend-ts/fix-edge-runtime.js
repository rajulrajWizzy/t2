/**
 * Fix Edge Runtime Issues in Next.js Project
 * 
 * This script:
 * 1. Updates all API routes to use Node.js runtime instead of Edge
 * 2. Updates middleware to use Node.js runtime
 * 3. Updates next.config.mjs to disable Edge Runtime
 * 4. Updates JWT utility to safely handle Edge/Node.js runtime differences
 * 
 * Run with: node fix-edge-runtime.js
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const readdir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const stat = promisify(fs.stat);

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Counter for modified files
let modifiedFiles = 0;

/**
 * Recursively finds all files in a directory matching specific extensions
 */
async function findFiles(dir, extensions, excludeDirs = []) {
  const files = [];
  
  // Skip excluded directories
  if (excludeDirs.includes(path.basename(dir))) {
    return files;
  }
  
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        // Skip node_modules and .next directories
        if (!excludeDirs.includes(entry.name)) {
          files.push(...await findFiles(fullPath, extensions, excludeDirs));
        }
      } else if (entry.isFile() && extensions.includes(path.extname(entry.name))) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    console.error(`${colors.red}Error reading directory ${dir}:${colors.reset}`, error.message);
  }
  
  return files;
}

/**
 * Fixes API routes to use Node.js runtime
 */
async function fixApiRoutes() {
  console.log(`\n${colors.cyan}Fixing API routes to use Node.js runtime...${colors.reset}`);
  
  try {
    // Find all API route files
    const apiRoutes = await findFiles(
      path.join(process.cwd(), 'src', 'app', 'api'),
      ['.js', '.ts', '.tsx'],
      ['node_modules', '.next', 'public']
    );
    
    console.log(`${colors.blue}Found ${apiRoutes.length} API route files${colors.reset}`);
    
    for (const filePath of apiRoutes) {
      let content = await readFile(filePath, 'utf8');
      let modified = false;
      
      // Check if Edge Runtime directive exists and replace it
      if (content.includes('export const runtime = "edge"') || content.includes("export const runtime = 'edge'")) {
        console.log(`${colors.yellow}Replacing Edge Runtime with Node.js runtime in ${filePath}${colors.reset}`);
        
        // Replace Edge Runtime with Node.js runtime
        content = content.replace(
          /export\s+const\s+runtime\s*=\s*["']edge["'];?/g,
          '// Edge Runtime disabled for better compatibility with Sequelize\nexport const runtime = "nodejs";'
        );
        modified = true;
      }
      
      // Ensure Node.js runtime directive exists
      if (!content.includes('export const runtime = "nodejs"') && !content.includes("export const runtime = 'nodejs'")) {
        console.log(`${colors.green}Adding Node.js runtime directive to ${filePath}${colors.reset}`);
        
        // Add the runtime directive at the top of the file
        content = '// Explicitly set Node.js runtime for this route\nexport const runtime = "nodejs";\n\n' + content;
        modified = true;
      }
      
      // Ensure dynamic directive exists
      if (!content.includes('export const dynamic')) {
        const dynamicDirective = '\nexport const dynamic = "force-dynamic";\nexport const fetchCache = "force-no-store";\n';
        
        // Position after the runtime directive if it exists
        if (content.includes('export const runtime')) {
          content = content.replace(
            /(export const runtime.+?;)/,
            '$1' + dynamicDirective
          );
        } else {
          // Otherwise add at the top
          content = dynamicDirective + content;
        }
        
        modified = true;
      }
      
      if (modified) {
        await writeFile(filePath, content, 'utf8');
        modifiedFiles++;
      }
    }
    
    console.log(`${colors.green}Fixed ${modifiedFiles} API route files${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}Error fixing API routes:${colors.reset}`, error);
  }
}

/**
 * Updates middleware to use Node.js runtime
 */
async function fixMiddleware() {
  console.log(`\n${colors.cyan}Fixing middleware to use Node.js runtime...${colors.reset}`);
  
  const middlewareFiles = [
    path.join(process.cwd(), 'middleware.ts'),
    path.join(process.cwd(), 'src', 'middleware.ts'),
    path.join(process.cwd(), 'app', 'middleware.ts'),
    path.join(process.cwd(), 'src', 'app', 'middleware.ts')
  ];
  
  let middlewareFixed = false;
  
  for (const filePath of middlewareFiles) {
    try {
      if (fs.existsSync(filePath)) {
        console.log(`${colors.blue}Found middleware at ${filePath}${colors.reset}`);
        
        let content = await readFile(filePath, 'utf8');
        let modified = false;
        
        // Replace Edge Runtime with Node.js runtime
        if (content.includes('export const runtime = "edge"') || content.includes("export const runtime = 'edge'")) {
          console.log(`${colors.yellow}Replacing Edge Runtime with Node.js runtime in middleware${colors.reset}`);
          
          content = content.replace(
            /export\s+const\s+runtime\s*=\s*["']edge["'];?/g,
            '// Edge Runtime disabled for Sequelize compatibility\nexport const runtime = "nodejs";'
          );
          modified = true;
        }
        
        // Ensure Node.js runtime directive exists
        if (!content.includes('export const runtime = "nodejs"') && !content.includes("export const runtime = 'nodejs'")) {
          console.log(`${colors.green}Adding Node.js runtime directive to middleware${colors.reset}`);
          
          // Add the runtime directive at the top of the file
          content = '// Explicitly set Node.js runtime for middleware\nexport const runtime = "nodejs";\n\n' + content;
          modified = true;
        }
        
        if (modified) {
          await writeFile(filePath, content, 'utf8');
          modifiedFiles++;
          middlewareFixed = true;
        }
      }
    } catch (error) {
      console.error(`${colors.red}Error updating middleware file ${filePath}:${colors.reset}`, error.message);
    }
  }
  
  if (!middlewareFixed) {
    console.log(`${colors.yellow}No middleware files found or no changes needed${colors.reset}`);
  }
  
  // Create or update middleware.config.js
  try {
    const configPath = path.join(process.cwd(), 'middleware.config.js');
    const configContent = `module.exports = {
  // Use Node.js environment instead of Edge runtime for middleware
  // This is needed for Sequelize compatibility
  runtime: 'nodejs'
};\n`;
    
    await writeFile(configPath, configContent, 'utf8');
    console.log(`${colors.green}Updated middleware.config.js${colors.reset}`);
    modifiedFiles++;
  } catch (error) {
    console.error(`${colors.red}Error updating middleware.config.js:${colors.reset}`, error.message);
  }
}

/**
 * Updates next.config.mjs to disable Edge Runtime
 */
async function fixNextConfig() {
  console.log(`\n${colors.cyan}Fixing Next.js config to use Node.js runtime...${colors.reset}`);
  
  const configFiles = [
    path.join(process.cwd(), 'next.config.js'),
    path.join(process.cwd(), 'next.config.mjs')
  ];
  
  let configFixed = false;
  
  for (const configPath of configFiles) {
    try {
      if (fs.existsSync(configPath)) {
        console.log(`${colors.blue}Found Next.js config at ${configPath}${colors.reset}`);
        
        let content = await readFile(configPath, 'utf8');
        let modified = false;
        
        // Check if the config already has runtime set to nodejs
        if (!content.includes('runtime: "nodejs"') && !content.includes("runtime: 'nodejs'")) {
          // Add runtime to the experimental section if it exists
          if (content.includes('experimental:')) {
            content = content.replace(
              /experimental:\s*{([^}]*)}/,
              'experimental: {$1, runtime: "nodejs"}'
            );
          } else {
            // Add a new experimental section
            content = content.replace(
              /const nextConfig = {/,
              'const nextConfig = {\n  experimental: {\n    runtime: "nodejs",\n    serverComponentsExternalPackages: [\'sequelize\', \'pg\', \'pg-hstore\', \'bcryptjs\']\n  },'
            );
          }
          
          // Also add runtime to serverRuntimeConfig if it exists
          if (content.includes('serverRuntimeConfig:')) {
            content = content.replace(
              /serverRuntimeConfig:\s*{([^}]*)}/,
              'serverRuntimeConfig: {$1, runtime: "nodejs"}'
            );
          }
          
          modified = true;
        }
        
        // Remove disableEdgeRuntime if it exists (no longer supported in newer Next.js)
        if (content.includes('disableEdgeRuntime:')) {
          content = content.replace(/,?\s*disableEdgeRuntime:\s*true/g, '');
          modified = true;
        }
        
        if (modified) {
          await writeFile(configPath, content, 'utf8');
          console.log(`${colors.green}Updated ${configPath} with Node.js runtime settings${colors.reset}`);
          modifiedFiles++;
          configFixed = true;
        } else {
          console.log(`${colors.blue}${configPath} already has proper runtime settings${colors.reset}`);
        }
      }
    } catch (error) {
      console.error(`${colors.red}Error updating Next.js config ${configPath}:${colors.reset}`, error.message);
    }
  }
  
  if (!configFixed) {
    console.log(`${colors.yellow}No Next.js config files found or no changes needed${colors.reset}`);
  }
}

/**
 * Updates JWT utility to safely handle Edge Runtime
 */
async function fixJwtUtils() {
  console.log(`\n${colors.cyan}Fixing JWT utilities to handle Edge Runtime safely...${colors.reset}`);
  
  const jwtPaths = [
    path.join(process.cwd(), 'src', 'utils', 'jwt.ts'),
    path.join(process.cwd(), 'src', 'config', 'jwt.ts'),
    path.join(process.cwd(), 'utils', 'jwt.ts'),
    path.join(process.cwd(), 'config', 'jwt.ts')
  ];
  
  let jwtFixed = false;
  
  for (const jwtPath of jwtPaths) {
    try {
      if (fs.existsSync(jwtPath)) {
        console.log(`${colors.blue}Found JWT utility at ${jwtPath}${colors.reset}`);
        
        let content = await readFile(jwtPath, 'utf8');
        let modified = false;
        
        // Check if the JWT utility already has Edge Runtime handling
        if (!content.includes('process.env.NEXT_RUNTIME !== \'edge\'')) {
          // Find functions that need Edge Runtime handling
          const functionsNeedingEdgeCheck = [
            'isTokenBlacklisted',
            'blacklistToken',
            'verifyTokenWithBlacklist'
          ];
          
          for (const funcName of functionsNeedingEdgeCheck) {
            // Only add the check if the function exists and doesn't already have it
            const funcRegex = new RegExp(`export\\s+async\\s+function\\s+${funcName}\\s*\\(`);
            if (funcRegex.test(content) && !content.includes(`${funcName}.*NEXT_RUNTIME !== 'edge'`)) {
              // Add check for Edge Runtime before using models
              content = content.replace(
                new RegExp(`(export\\s+async\\s+function\\s+${funcName}\\s*\\([^{]+{)`),
                '$1\n  // This function should only be called from API routes, not middleware\n  if (typeof window === \'undefined\' && process.env.NEXT_RUNTIME !== \'edge\') {'
              );
              
              // Add closing brace at the end of the function body
              content = content.replace(
                new RegExp(`(export\\s+async\\s+function\\s+${funcName}\\s*\\([^{]+{[\\s\\S]+?)(\\n\\s*}\\s*\\n)`),
                '$1\n  }\n  return false;$2'
              );
              
              modified = true;
            }
          }
        }
        
        // Add runtime directive if not already present
        if (!content.includes('export const runtime')) {
          content = '// Explicitly set Node.js runtime for this utility\nexport const runtime = "nodejs";\n\n' + content;
          modified = true;
        }
        
        if (modified) {
          await writeFile(jwtPath, content, 'utf8');
          console.log(`${colors.green}Updated ${jwtPath} with Edge Runtime handling${colors.reset}`);
          modifiedFiles++;
          jwtFixed = true;
        } else {
          console.log(`${colors.blue}${jwtPath} already has Edge Runtime handling${colors.reset}`);
        }
      }
    } catch (error) {
      console.error(`${colors.red}Error updating JWT utility ${jwtPath}:${colors.reset}`, error.message);
    }
  }
  
  if (!jwtFixed) {
    console.log(`${colors.yellow}No JWT utility files found or no changes needed${colors.reset}`);
  }
}

/**
 * Creates a runtime configuration file for the app directory
 */
async function createRuntimeConfig() {
  console.log(`\n${colors.cyan}Creating runtime configuration files...${colors.reset}`);
  
  const configs = [
    {
      path: path.join(process.cwd(), 'src', 'app', 'api-config.js'),
      content: `// Global API configuration
// Use Node.js runtime instead of Edge Runtime for all API routes
export const runtime = 'nodejs';
// This disables dynamic code evaluation restrictions
// which is not supported in Edge Runtime
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
`
    },
    {
      path: path.join(process.cwd(), 'runtime-config.js'),
      content: `// This disables Edge Runtime for the entire application
module.exports = {
  runtime: 'nodejs',
  disableEdgeRuntime: true
};
`
    }
  ];
  
  for (const config of configs) {
    try {
      await writeFile(config.path, config.content, 'utf8');
      console.log(`${colors.green}Created runtime configuration at ${config.path}${colors.reset}`);
      modifiedFiles++;
    } catch (error) {
      console.error(`${colors.red}Error creating runtime config ${config.path}:${colors.reset}`, error.message);
    }
  }
}

/**
 * Main function to fix all Edge Runtime issues
 */
async function main() {
  console.log(`${colors.magenta}=== Fixing Edge Runtime Issues ====${colors.reset}`);
  
  // Execute all fix functions
  await fixApiRoutes();
  await fixMiddleware();
  await fixNextConfig();
  await fixJwtUtils();
  await createRuntimeConfig();
  
  console.log(`\n${colors.green}=== Edge Runtime Issues Fixed ====${colors.reset}`);
  console.log(`${colors.green}Modified ${modifiedFiles} files${colors.reset}`);
  console.log(`\n${colors.cyan}Next steps:${colors.reset}`);
  console.log(`1. Run ${colors.yellow}npm run dev${colors.reset} to test your application`);
  console.log(`2. Verify API routes are working correctly`);
  console.log(`3. Update package.json to run this script before build if needed`);
}

// Run the main function
main().catch(error => {
  console.error(`${colors.red}Error fixing Edge Runtime issues:${colors.reset}`, error);
  process.exit(1);
}); 