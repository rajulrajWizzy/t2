const fs = require('fs');
const path = require('path');

// Configuration
const API_ROUTES_DIR = path.join(__dirname, '..', 'app', 'api');
const OUTPUT_FILE = path.join(__dirname, '..', '..', 'API_ENDPOINTS.md');

// Ensure the script is working
console.log('Starting API endpoint analysis...');
console.log(`Looking for API routes in: ${API_ROUTES_DIR}`);

// Categories
const categories = {
  admin: {
    title: '# Admin API Endpoints',
    description: 'These endpoints are intended for admin use and require admin authentication.',
    endpoints: []
  },
  user: {
    title: '# User API Endpoints',
    description: 'These endpoints are for regular users.',
    endpoints: []
  },
  auth: {
    title: '# Authentication Endpoints',
    description: 'These endpoints handle user and admin authentication.',
    endpoints: []
  },
  public: {
    title: '# Public API Endpoints',
    description: 'These endpoints are publicly accessible without authentication.',
    endpoints: []
  }
};

// Authentication checks
const authChecks = {
  verifyAdmin: 'Admin',
  verifySuperAdmin: 'Super Admin',
  verifyBranchAccess: 'Branch Admin',
  verifyPermission: 'Admin with Permissions',
  verifyAuth: 'User',
  verifyTokenFromRequest: 'User',
  requiresAuth: 'User'
};

/**
 * Check if file content contains authentication checks
 */
function getAuthRequirement(fileContent) {
  for (const [check, authType] of Object.entries(authChecks)) {
    if (fileContent.includes(check)) {
      return authType;
    }
  }
  return 'None';
}

/**
 * Get HTTP methods from route file
 */
function getHttpMethods(fileContent) {
  const methods = [];
  if (fileContent.includes('async function GET')) methods.push('GET');
  if (fileContent.includes('async function POST')) methods.push('POST');
  if (fileContent.includes('async function PUT')) methods.push('PUT');
  if (fileContent.includes('async function DELETE')) methods.push('DELETE');
  if (fileContent.includes('async function PATCH')) methods.push('PATCH');
  if (fileContent.includes('async function OPTIONS')) methods.push('OPTIONS');
  return methods.length > 0 ? methods : ['GET']; // Default to GET if no method found
}

/**
 * Determine the category of the endpoint
 */
function getCategory(filePath, authRequirement) {
  if (filePath.includes('/api/admin/')) {
    return 'admin';
  } else if (filePath.includes('/api/auth/')) {
    return 'auth';
  } else if (authRequirement !== 'None') {
    return 'user';
  } else {
    return 'public';
  }
}

/**
 * Get path parameters from file path
 */
function getPathParams(apiPath) {
  const params = [];
  const segments = apiPath.split('/');
  
  for (const segment of segments) {
    if (segment.startsWith('[') && segment.endsWith(']')) {
      let paramName = segment.substring(1, segment.length - 1);
      if (paramName.startsWith('...')) {
        paramName = paramName.substring(3) + ' (rest)';
      }
      params.push(paramName);
    }
  }
  
  return params;
}

/**
 * Format API path for display
 */
function formatApiPath(filePath) {
  // Extract the api path from the file path
  const apiPathMatch = filePath.match(/src(\/|\\)app(\/|\\)api(\/|\\)(.+)(\/|\\)route\.ts$/);
  if (!apiPathMatch) {
    console.log(`Cannot match path for: ${filePath}`);
    return 'Unknown path';
  }
  
  // Replace backslashes with forward slashes for consistency
  let apiPath = '/api/' + apiPathMatch[4].replace(/\\/g, '/');
  
  // Replace [param] with :param for better readability
  apiPath = apiPath.replace(/\[\.\.\.(\w+)\]/g, ':$1*');
  apiPath = apiPath.replace(/\[(\w+)\]/g, ':$1');
  
  return apiPath;
}

/**
 * Find all API route files recursively
 */
function findApiRouteFiles(dir, fileList = []) {
  console.log(`Scanning directory: ${dir}`);
  try {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        findApiRouteFiles(filePath, fileList);
      } else if (file === 'route.ts') {
        console.log(`Found route file: ${filePath}`);
        fileList.push(filePath);
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error);
  }
  
  return fileList;
}

/**
 * Generate endpoint information
 */
function generateEndpointInfo() {
  const routeFiles = findApiRouteFiles(API_ROUTES_DIR);
  console.log(`Found ${routeFiles.length} route files.`);
  
  for (const filePath of routeFiles) {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const apiPath = formatApiPath(filePath);
      const authRequirement = getAuthRequirement(fileContent);
      const httpMethods = getHttpMethods(fileContent);
      const pathParams = getPathParams(apiPath);
      const category = getCategory(filePath, authRequirement);
      
      console.log(`Processing ${apiPath} - Auth: ${authRequirement}, Category: ${category}`);
      
      for (const method of httpMethods) {
        categories[category].endpoints.push({
          path: apiPath,
          method,
          authRequirement,
          pathParams,
          filePath: filePath.replace(/^.*?src(\/|\\)/, 'src/').replace(/\\/g, '/'),
        });
      }
    } catch (error) {
      console.error(`Error processing file ${filePath}:`, error);
    }
  }
}

/**
 * Generate markdown table for endpoints
 */
function generateMarkdownTable(endpoints) {
  if (endpoints.length === 0) return 'No endpoints in this category.\n\n';
  
  let markdown = '| Method | Path | Authentication | Path Parameters | Source File |\n';
  markdown += '| ------ | ---- | -------------- | --------------- | ----------- |\n';
  
  for (const endpoint of endpoints) {
    const pathParams = endpoint.pathParams.length > 0 
      ? endpoint.pathParams.join(', ') 
      : 'None';
    
    markdown += `| ${endpoint.method} | \`${endpoint.path}\` | ${endpoint.authRequirement} | ${pathParams} | ${endpoint.filePath} |\n`;
  }
  
  return markdown + '\n';
}

/**
 * Generate full markdown output
 */
function generateMarkdown() {
  // Generate endpoint info
  generateEndpointInfo();
  
  let markdown = '# CoWorks API Endpoints\n\n';
  markdown += 'This document lists all API endpoints available in the CoWorks backend.\n\n';
  markdown += '## Table of Contents\n\n';
  markdown += '- [Authentication Endpoints](#authentication-endpoints)\n';
  markdown += '- [User API Endpoints](#user-api-endpoints)\n';
  markdown += '- [Admin API Endpoints](#admin-api-endpoints)\n';
  markdown += '- [Public API Endpoints](#public-api-endpoints)\n\n';
  
  // Generate sections
  for (const [key, category] of Object.entries(categories)) {
    markdown += category.title + '\n\n';
    markdown += category.description + '\n\n';
    markdown += generateMarkdownTable(category.endpoints);
  }
  
  // Add authorization instructions
  markdown += '# API Authentication Guide\n\n';
  markdown += '## User Authentication\n\n';
  markdown += 'To authenticate user requests:\n\n';
  markdown += '1. First obtain a token by calling the `/api/auth/login` endpoint with valid credentials\n';
  markdown += '2. Include the token in the `Authorization` header of subsequent requests:\n\n';
  markdown += '```\nAuthorization: Bearer YOUR_TOKEN\n```\n\n';
  
  markdown += '## Admin Authentication\n\n';
  markdown += 'To authenticate admin requests:\n\n';
  markdown += '1. Obtain a token by calling the `/api/admin/auth/login` endpoint with valid admin credentials\n';
  markdown += '2. Include the token in the `Authorization` header of subsequent requests:\n\n';
  markdown += '```\nAuthorization: Bearer YOUR_ADMIN_TOKEN\n```\n\n';
  
  markdown += '## Authentication Levels\n\n';
  markdown += '- **None**: No authentication required\n';
  markdown += '- **User**: Regular user authentication required\n';
  markdown += '- **Admin**: General admin authentication required\n';
  markdown += '- **Super Admin**: Super admin role required\n';
  markdown += '- **Branch Admin**: Branch admin role with access to the specified branch\n';
  
  return markdown;
}

// Generate the markdown and write to file
const markdown = generateMarkdown();
fs.writeFileSync(OUTPUT_FILE, markdown);

console.log(`API endpoints documentation generated at ${OUTPUT_FILE}`);

// Also generate JSON for easier programmatic access
const endpointsJson = {};
for (const [key, category] of Object.entries(categories)) {
  endpointsJson[key] = category.endpoints;
}

fs.writeFileSync(
  path.join(__dirname, '..', '..', 'api-endpoints.json'), 
  JSON.stringify(endpointsJson, null, 2)
);

console.log(`API endpoints JSON generated at api-endpoints.json`);

// Check for authentication issues in the route files
let authIssuesFound = false;
console.log('\nChecking for authentication issues...');

for (const [key, category] of Object.entries(categories)) {
  for (const endpoint of category.endpoints) {
    // Check for inconsistencies between category and auth requirements
    if (key === 'admin' && endpoint.authRequirement === 'None') {
      authIssuesFound = true;
      console.log(`⚠️ Admin endpoint without authentication check: ${endpoint.method} ${endpoint.path} in ${endpoint.filePath}`);
    }
    
    if (key === 'user' && endpoint.authRequirement === 'None') {
      authIssuesFound = true;
      console.log(`⚠️ User endpoint without authentication check: ${endpoint.method} ${endpoint.path} in ${endpoint.filePath}`);
    }
  }
}

if (!authIssuesFound) {
  console.log('✅ No authentication issues found in route files.');
} 