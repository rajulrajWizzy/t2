/**
 * Unified Scripts
 * 
 * This file combines all utility scripts into a single executable file with different commands.
 * Usage: node unified-scripts.js [command] [options]
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const axios = require('axios');
const { execSync } = require('child_process');
const { Sequelize, DataTypes } = require('sequelize');

// Load environment variables
dotenv.config();

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

// Helper function to log with color
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

// Get current timestamp
function getCurrentTimestamp() {
  return new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
}

// Create sequelize instance
function getSequelizeInstance() {
  const dbSchema = process.env.DB_SCHEMA || 'public';
  
  // SSL configuration
  const sslConfig = {
    require: true,
    rejectUnauthorized: false
  };
  
  // Common options
  const commonOptions = {
    dialect: 'postgres',
    logging: process.env.DB_LOGGING === 'true' ? console.log : false,
    schema: dbSchema,
    dialectOptions: {
      ssl: sslConfig
    }
  };
  
  let sequelize;
  
  // Check if DATABASE_URL exists (production)
  if (process.env.DATABASE_URL) {
    log('Using DATABASE_URL for connection', colors.cyan);
    sequelize = new Sequelize(process.env.DATABASE_URL, commonOptions);
  } else {
    // Fallback to individual credentials (local development)
    log('Using individual credentials for connection', colors.cyan);
    sequelize = new Sequelize(
      process.env.DB_NAME || 'coworks_db',
      process.env.DB_USER || 'postgres',
      process.env.DB_PASS || '',
      {
        ...commonOptions,
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10)
      }
    );
  }
  
  return sequelize;
}

// ===== API ENDPOINT DOCUMENTATION =====

async function generateApiEndpointDocs() {
  log(`${colors.bright}${colors.cyan}===== Generating API Endpoint Documentation =====`, colors.cyan);
  
  try {
    const srcPath = path.join(process.cwd(), 'src');
    const apiDir = path.join(srcPath, 'api');
    const docsDir = path.join(srcPath, 'scripts', 'docs');
    
    // Create docs directory if it doesn't exist
    if (!fs.existsSync(docsDir)) {
      fs.mkdirSync(docsDir, { recursive: true });
      log('✅ Created docs directory', colors.green);
    }
    
    // Find all API endpoint files
    const endpointFiles = findApiEndpointFiles(apiDir);
    log(`Found ${endpointFiles.length} API endpoint files`, colors.cyan);
    
    // Parse each file to extract endpoint information
    const endpoints = [];
    for (const file of endpointFiles) {
      const content = fs.readFileSync(file, 'utf8');
      const parsedEndpoints = parseEndpointFile(content, file);
      endpoints.push(...parsedEndpoints);
    }
    
    // Generate documentation files
    await generateDocFiles(endpoints, docsDir);
    
    log(`✅ API documentation generated successfully in ${docsDir}`, colors.green);
  } catch (error) {
    log(`❌ Error generating API documentation: ${error.message}`, colors.red);
    console.error(error);
  }
}

function findApiEndpointFiles(apiDir) {
  const files = [];
  
  function scanDirectory(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        scanDirectory(fullPath);
      } else if (entry.isFile() && 
                (entry.name.endsWith('.js') || entry.name.endsWith('.ts')) && 
                !entry.name.includes('.test.') && 
                !entry.name.includes('.spec.')) {
        files.push(fullPath);
      }
    }
  }
  
  scanDirectory(apiDir);
  return files;
}

function parseEndpointFile(content, filePath) {
  // This is a simplified version. In a real implementation, we would use
  // more sophisticated parsing techniques like AST parsing.
  const endpoints = [];
  const relativeFilePath = path.relative(process.cwd(), filePath);
  
  // Extract route patterns
  const routePattern = /router\.(get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]/g;
  let match;
  
  while ((match = routePattern.exec(content)) !== null) {
    const method = match[1].toUpperCase();
    const route = match[2];
    
    // Try to extract function name or description
    const functionNamePattern = new RegExp(`${method.toLowerCase()}\\s*\\([\\s\\S]*?(?:async\\s+)?(?:function\\s+)?(\\w+)?\\s*\\(`, 'i');
    const functionNameMatch = functionNamePattern.exec(content.slice(match.index));
    
    // Try to extract comments for documentation
    const commentPattern = /\/\*\*([\s\S]*?)\*\/\s*router\.(get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]/g;
    const commentRegex = new RegExp(commentPattern);
    commentRegex.lastIndex = Math.max(0, match.index - 500); // Look for comments before the route
    const commentMatch = commentRegex.exec(content);
    
    // Check if the found comment belongs to this route
    const hasMatchingComment = commentMatch && 
                              commentMatch[2] === match[1] && 
                              commentMatch[3] === match[2];
    
    // Parse JSDoc comments
    let description = '';
    let parameters = [];
    let responses = [];
    
    if (hasMatchingComment) {
      const comment = commentMatch[1];
      
      // Extract description
      const descriptionMatch = comment.match(/@description\s+(.*?)(\n|$)/);
      if (descriptionMatch) {
        description = descriptionMatch[1].trim();
      }
      
      // Extract parameters
      const paramMatches = comment.matchAll(/@param\s+{([^}]+)}\s+([^\s]+)\s+(.*?)(\n|$)/g);
      for (const paramMatch of paramMatches) {
        parameters.push({
          type: paramMatch[1].trim(),
          name: paramMatch[2].trim(),
          description: paramMatch[3].trim()
        });
      }
      
      // Extract responses
      const responseMatches = comment.matchAll(/@returns\s+{([^}]+)}\s+(.*?)(\n|$)/g);
      for (const responseMatch of responseMatches) {
        responses.push({
          code: responseMatch[1].trim(),
          description: responseMatch[2].trim()
        });
      }
    }
    
    endpoints.push({
      method,
      route,
      file: relativeFilePath,
      functionName: functionNameMatch ? functionNameMatch[1] || 'anonymous' : 'unknown',
      description,
      parameters,
      responses
    });
  }
  
  return endpoints;
}

async function generateDocFiles(endpoints, docsDir) {
  // Group endpoints by base path
  const groupedEndpoints = {};
  
  for (const endpoint of endpoints) {
    const basePath = endpoint.route.split('/')[1] || 'misc';
    
    if (!groupedEndpoints[basePath]) {
      groupedEndpoints[basePath] = [];
    }
    
    groupedEndpoints[basePath].push(endpoint);
  }
  
  // Create a markdown file for each group
  for (const [group, groupEndpoints] of Object.entries(groupedEndpoints)) {
    const markdown = generateMarkdownForGroup(group, groupEndpoints);
    const filePath = path.join(docsDir, `${group}-endpoints.md`);
    
    fs.writeFileSync(filePath, markdown, 'utf8');
    log(`Generated documentation for ${group} endpoints: ${filePath}`, colors.green);
  }
  
  // Create an index file
  const indexContent = generateIndexMarkdown(groupedEndpoints);
  fs.writeFileSync(path.join(docsDir, 'api-index.md'), indexContent, 'utf8');
  log(`Generated API index: ${path.join(docsDir, 'api-index.md')}`, colors.green);
  
  // Create a single comprehensive file
  const allContent = generateCompleteApiDocs(groupedEndpoints);
  fs.writeFileSync(path.join(docsDir, 'complete-api-docs.md'), allContent, 'utf8');
  log(`Generated comprehensive API documentation: ${path.join(docsDir, 'complete-api-docs.md')}`, colors.green);
}

function generateMarkdownForGroup(group, endpoints) {
  let markdown = `# ${group.toUpperCase()} API Endpoints\n\n`;
  markdown += `Generated on: ${getCurrentTimestamp()}\n\n`;
  markdown += `| Method | Endpoint | Description | Function |\n`;
  markdown += `|--------|----------|-------------|----------|\n`;
  
  // Add summary table
  for (const endpoint of endpoints) {
    markdown += `| ${endpoint.method} | \`${endpoint.route}\` | ${endpoint.description || 'No description'} | \`${endpoint.functionName}\` |\n`;
  }
  
  markdown += `\n## Detailed Endpoint Information\n\n`;
  
  // Add detailed information
  for (const endpoint of endpoints) {
    markdown += `### ${endpoint.method} \`${endpoint.route}\`\n\n`;
    
    if (endpoint.description) {
      markdown += `**Description:** ${endpoint.description}\n\n`;
    }
    
    markdown += `**Source File:** \`${endpoint.file}\`\n\n`;
    markdown += `**Handler Function:** \`${endpoint.functionName}\`\n\n`;
    
    if (endpoint.parameters.length > 0) {
      markdown += `**Parameters:**\n\n`;
      markdown += `| Type | Name | Description |\n`;
      markdown += `|------|------|-------------|\n`;
      
      for (const param of endpoint.parameters) {
        markdown += `| ${param.type} | ${param.name} | ${param.description} |\n`;
      }
      
      markdown += `\n`;
    }
    
    if (endpoint.responses.length > 0) {
      markdown += `**Responses:**\n\n`;
      markdown += `| Status Code | Description |\n`;
      markdown += `|-------------|-------------|\n`;
      
      for (const response of endpoint.responses) {
        markdown += `| ${response.code} | ${response.description} |\n`;
      }
      
      markdown += `\n`;
    }
    
    markdown += `---\n\n`;
  }
  
  return markdown;
}

function generateIndexMarkdown(groupedEndpoints) {
  let markdown = `# API Documentation Index\n\n`;
  markdown += `Generated on: ${getCurrentTimestamp()}\n\n`;
  
  // Add links to each group document
  markdown += `## API Groups\n\n`;
  
  for (const group of Object.keys(groupedEndpoints).sort()) {
    const count = groupedEndpoints[group].length;
    markdown += `- [${group.toUpperCase()} API](${group}-endpoints.md) (${count} endpoints)\n`;
  }
  
  // Add a summary of all endpoints
  markdown += `\n## All Endpoints\n\n`;
  markdown += `| Group | Method | Endpoint | Description |\n`;
  markdown += `|-------|--------|----------|-------------|\n`;
  
  for (const [group, endpoints] of Object.entries(groupedEndpoints)) {
    for (const endpoint of endpoints) {
      markdown += `| ${group.toUpperCase()} | ${endpoint.method} | \`${endpoint.route}\` | ${endpoint.description || 'No description'} |\n`;
    }
  }
  
  return markdown;
}

function generateCompleteApiDocs(groupedEndpoints) {
  let markdown = `# Complete API Documentation\n\n`;
  markdown += `Generated on: ${getCurrentTimestamp()}\n\n`;
  markdown += `## Table of Contents\n\n`;
  
  // Add table of contents
  for (const group of Object.keys(groupedEndpoints).sort()) {
    markdown += `- [${group.toUpperCase()} API](#${group.toLowerCase()}-api)\n`;
  }
  
  markdown += `\n`;
  
  // Add each group's content
  for (const [group, endpoints] of Object.entries(groupedEndpoints)) {
    markdown += `## ${group.toUpperCase()} API\n\n`;
    markdown += `| Method | Endpoint | Description | Function |\n`;
    markdown += `|--------|----------|-------------|----------|\n`;
    
    for (const endpoint of endpoints) {
      markdown += `| ${endpoint.method} | \`${endpoint.route}\` | ${endpoint.description || 'No description'} | \`${endpoint.functionName}\` |\n`;
    }
    
    markdown += `\n### Detailed Endpoint Information\n\n`;
    
    for (const endpoint of endpoints) {
      markdown += `#### ${endpoint.method} \`${endpoint.route}\`\n\n`;
      
      if (endpoint.description) {
        markdown += `**Description:** ${endpoint.description}\n\n`;
      }
      
      markdown += `**Source File:** \`${endpoint.file}\`\n\n`;
      markdown += `**Handler Function:** \`${endpoint.functionName}\`\n\n`;
      
      if (endpoint.parameters.length > 0) {
        markdown += `**Parameters:**\n\n`;
        markdown += `| Type | Name | Description |\n`;
        markdown += `|------|------|-------------|\n`;
        
        for (const param of endpoint.parameters) {
          markdown += `| ${param.type} | ${param.name} | ${param.description} |\n`;
        }
        
        markdown += `\n`;
      }
      
      if (endpoint.responses.length > 0) {
        markdown += `**Responses:**\n\n`;
        markdown += `| Status Code | Description |\n`;
        markdown += `|-------------|-------------|\n`;
        
        for (const response of endpoint.responses) {
          markdown += `| ${response.code} | ${response.description} |\n`;
        }
        
        markdown += `\n`;
      }
      
      markdown += `---\n\n`;
    }
  }
  
  return markdown;
}

// ===== API TESTER =====

async function runApiTests(endpoint, method, data) {
  log(`${colors.bright}${colors.cyan}===== Running API Tests =====`, colors.cyan);
  
  try {
    const baseUrl = process.env.API_BASE_URL || 'http://localhost:3000/api';
    const url = `${baseUrl}${endpoint}`;
    
    log(`Testing ${method.toUpperCase()} ${url}`, colors.blue);
    
    // Create admin user if testing admin routes
    if (endpoint.startsWith('/admin') && !global.adminToken) {
      await loginAsAdmin();
    }
    
    // Create customer user if testing customer routes
    if (endpoint.startsWith('/customer') && !global.customerToken) {
      await loginAsCustomer();
    }
    
    // Determine which token to use
    let token = null;
    if (endpoint.startsWith('/admin')) {
      token = global.adminToken;
    } else if (endpoint.startsWith('/customer')) {
      token = global.customerToken;
    }
    
    // Configure axios request
    const config = {
      method: method.toLowerCase(),
      url,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    // Add authorization header if token exists
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Add data if provided
    if (data && (method.toLowerCase() === 'post' || 
                method.toLowerCase() === 'put' || 
                method.toLowerCase() === 'patch')) {
      config.data = data;
    } else if (data && method.toLowerCase() === 'get') {
      config.params = data;
    }
    
    log('Request configuration:', colors.yellow);
    log(JSON.stringify(config, null, 2), colors.reset);
    
    // Make the request
    const startTime = Date.now();
    const response = await axios(config);
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Log response
    log(`\nResponse (${duration}ms):`, colors.green);
    log(`Status: ${response.status} ${response.statusText}`, colors.green);
    log('Headers:', colors.yellow);
    log(JSON.stringify(response.headers, null, 2), colors.reset);
    log('Body:', colors.yellow);
    log(JSON.stringify(response.data, null, 2), colors.reset);
    
    return response.data;
  } catch (error) {
    log('Error:', colors.red);
    
    if (error.response) {
      log(`Status: ${error.response.status} ${error.response.statusText}`, colors.red);
      log('Headers:', colors.yellow);
      log(JSON.stringify(error.response.headers, null, 2), colors.reset);
      log('Body:', colors.yellow);
      log(JSON.stringify(error.response.data, null, 2), colors.reset);
    } else if (error.request) {
      log('No response received', colors.red);
      log(error.request, colors.reset);
    } else {
      log('Error setting up request:', colors.red);
      log(error.message, colors.reset);
    }
    
    if (error.config) {
      log('Request config:', colors.yellow);
      log(JSON.stringify(error.config, null, 2), colors.reset);
    }
    
    throw error;
  }
}

async function loginAsAdmin() {
  try {
    log('Logging in as admin...', colors.cyan);
    
    const response = await axios({
      method: 'post',
      url: `${process.env.API_BASE_URL || 'http://localhost:3000/api'}/admin/auth/login`,
      data: {
        email: process.env.ADMIN_EMAIL || 'admin@example.com',
        password: process.env.ADMIN_PASSWORD || 'adminpassword'
      }
    });
    
    global.adminToken = response.data.token;
    log('✅ Admin login successful', colors.green);
  } catch (error) {
    log('❌ Admin login failed', colors.red);
    log(error.message, colors.reset);
  }
}

async function loginAsCustomer() {
  try {
    log('Logging in as customer...', colors.cyan);
    
    const response = await axios({
      method: 'post',
      url: `${process.env.API_BASE_URL || 'http://localhost:3000/api'}/customer/auth/login`,
      data: {
        email: process.env.CUSTOMER_EMAIL || 'customer@example.com',
        password: process.env.CUSTOMER_PASSWORD || 'customerpassword'
      }
    });
    
    global.customerToken = response.data.token;
    log('✅ Customer login successful', colors.green);
  } catch (error) {
    log('❌ Customer login failed', colors.red);
    log(error.message, colors.reset);
  }
}

// ===== AUTH FIX =====

async function fixAuthTokens() {
  log(`${colors.bright}${colors.cyan}===== Fixing Authentication Tokens =====`, colors.cyan);
  
  try {
    const sequelize = getSequelizeInstance();
    await sequelize.authenticate();
    log('✅ Database connection established', colors.green);
    
    const schema = process.env.DB_SCHEMA || 'public';
    
    // Clear expired blacklisted tokens
    const [deletedRows] = await sequelize.query(`
      DELETE FROM "${schema}"."blacklisted_tokens"
      WHERE expires_at < NOW()
      RETURNING id;
    `);
    
    log(`✅ Deleted ${deletedRows.length} expired blacklisted tokens`, colors.green);
    
    // Clear expired password reset tokens
    const [resetRows] = await sequelize.query(`
      DELETE FROM "${schema}"."password_reset"
      WHERE expires_at < NOW() OR used = true
      RETURNING id;
    `);
    
    log(`✅ Deleted ${resetRows.length} expired/used password reset tokens`, colors.green);
    
    // Clear expired verification tokens
    const [customerRows] = await sequelize.query(`
      UPDATE "${schema}"."customers"
      SET verification_token = NULL, verification_expires = NULL
      WHERE verification_expires < NOW() AND verification_token IS NOT NULL
      RETURNING id;
    `);
    
    log(`✅ Cleared verification tokens for ${customerRows.length} customers`, colors.green);
    
    await sequelize.close();
    log('✅ Auth token cleanup completed successfully', colors.green);
  } catch (error) {
    log(`❌ Error fixing auth tokens: ${error.message}`, colors.red);
    console.error(error);
  }
}

// ===== VERIFICATION RUNNER =====

async function runVerifications() {
  log(`${colors.bright}${colors.cyan}===== Running Verifications =====`, colors.cyan);
  
  try {
    const sequelize = getSequelizeInstance();
    const schema = process.env.DB_SCHEMA || 'public';
    
    // First, check if the enum type exists
    const [enumCheck] = await sequelize.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_type 
        WHERE typname = 'enum_seat_bookings_status'
        AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = '${schema}')
      ) as exists;
    `);
    
    const enumExists = enumCheck[0]?.exists || false;
    log(`Enum check: seat_bookings_status enum ${enumExists ? 'exists' : 'does not exist'}`, colors.cyan);
    
    // Set default valid status values
    let validStatuses = {
      pending: true,
      confirmed: true,
      completed: true,
      cancelled: true
    };
    
    // Store actual enum values for SQL queries
    let actualStatusValues = {
      pending: 'pending',
      confirmed: 'confirmed',
      completed: 'completed',
      cancelled: 'cancelled'
    };
    
    if (enumExists) {
      // Get the valid status values for seat_bookings
      const [statusResult] = await sequelize.query(`
        SELECT enum_range(NULL::${schema}.enum_seat_bookings_status) as status_values;
      `);
      
      if (statusResult && statusResult.length > 0 && statusResult[0].status_values) {
        let statusArray = [];
        
        // Handle different possible formats of the enum_range result
        const statusValues = statusResult[0].status_values;
        if (typeof statusValues === 'string') {
          // Handle string format like "{pending,confirmed,completed,cancelled}"
          statusArray = statusValues.replace(/[{}]/g, '').split(',');
        } else if (Array.isArray(statusValues)) {
          // Handle array format
          statusArray = statusValues;
        }
        
        if (statusArray.length > 0) {
          log(`Available booking status values: ${statusArray.join(', ')}`, colors.cyan);
          
          // Reset validStatuses and mark only valid ones (case-insensitive)
          validStatuses = {
            pending: false,
            confirmed: false,
            completed: false,
            cancelled: false
          };
          
          // Store actual enum values for SQL queries
          actualStatusValues = {
            pending: '',
            confirmed: '',
            completed: '',
            cancelled: ''
          };
          
          // Match statuses case-insensitively
          for (const status of statusArray) {
            const lowerStatus = status.toLowerCase();
            if (lowerStatus === 'pending') {
              validStatuses.pending = true;
              actualStatusValues.pending = status; // Store actual case
            } else if (lowerStatus === 'confirmed') {
              validStatuses.confirmed = true;
              actualStatusValues.confirmed = status;
            } else if (lowerStatus === 'completed') {
              validStatuses.completed = true;
              actualStatusValues.completed = status;
            } else if (lowerStatus === 'cancelled') {
              validStatuses.cancelled = true;
              actualStatusValues.cancelled = status;
            }
          }
        }
      }
    }
    
    // Try to get valid status values directly from table
    try {
      const [tableStatuses] = await sequelize.query(`
        SELECT DISTINCT status FROM "${schema}"."seat_bookings";
      `);
      
      if (tableStatuses && tableStatuses.length > 0) {
        const existingStatuses = tableStatuses.map(row => row.status);
        log(`Existing status values in table: ${existingStatuses.join(', ')}`, colors.cyan);
        
        // If we haven't found valid enum values, use the values from the table
        if (!validStatuses.pending && !validStatuses.confirmed && 
            !validStatuses.completed && !validStatuses.cancelled) {
          
          for (const status of existingStatuses) {
            const lowerStatus = status.toLowerCase();
            if (lowerStatus === 'pending') {
              validStatuses.pending = true;
              actualStatusValues.pending = status;
            } else if (lowerStatus === 'confirmed') {
              validStatuses.confirmed = true;
              actualStatusValues.confirmed = status;
            } else if (lowerStatus === 'completed') {
              validStatuses.completed = true;
              actualStatusValues.completed = status;
            } else if (lowerStatus === 'cancelled') {
              validStatuses.cancelled = true;
              actualStatusValues.cancelled = status;
            }
          }
        }
      }
    } catch (error) {
      log(`⚠️ Could not fetch existing statuses: ${error.message}`, colors.yellow);
    }
    
    // Verify bookings - update status for completed bookings
    if (validStatuses.completed && validStatuses.confirmed) {
      try {
        const [expiredBookings] = await sequelize.query(`
          UPDATE "${schema}"."seat_bookings"
          SET status = '${actualStatusValues.completed}'
          WHERE end_time < NOW() AND status = '${actualStatusValues.confirmed}'
          RETURNING id;
        `);
        
        log(`✅ Updated ${expiredBookings.length} expired seat bookings to '${actualStatusValues.completed}'`, colors.green);
      } catch (error) {
        log(`⚠️ Could not update seat bookings: ${error.message}`, colors.yellow);
      }
      
      // Verify meeting bookings - update status for completed bookings
      try {
        const [expiredMeetings] = await sequelize.query(`
          UPDATE "${schema}"."meeting_bookings"
          SET status = '${actualStatusValues.completed}'
          WHERE end_time < NOW() AND status = '${actualStatusValues.confirmed}'
          RETURNING id;
        `);
        
        log(`✅ Updated ${expiredMeetings.length} expired meeting bookings to '${actualStatusValues.completed}'`, colors.green);
      } catch (error) {
        log(`⚠️ Could not update meeting bookings: ${error.message}`, colors.yellow);
      }
    } else {
      log(`⚠️ Skipping status updates - 'completed' or 'confirmed' not valid enum values`, colors.yellow);
    }
    
    // First check if payment_status column exists in seat_bookings
    let seatPaymentStatusExists = true;
    let meetingPaymentStatusExists = true;
    
    try {
      const [seatPaymentStatusCheck] = await sequelize.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns
          WHERE table_schema = '${schema}'
          AND table_name = 'seat_bookings'
          AND column_name = 'payment_status'
        ) as exists;
      `);
      
      seatPaymentStatusExists = seatPaymentStatusCheck[0].exists;
      
      // Check meeting_bookings too
      const [meetingPaymentStatusCheck] = await sequelize.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns
          WHERE table_schema = '${schema}'
          AND table_name = 'meeting_bookings'
          AND column_name = 'payment_status'
        ) as exists;
      `);
      
      meetingPaymentStatusExists = meetingPaymentStatusCheck[0].exists;
      
    } catch (error) {
      log(`⚠️ Could not check for payment_status column: ${error.message}`, colors.yellow);
      seatPaymentStatusExists = false;
      meetingPaymentStatusExists = false;
    }
    
    // Cancel pending bookings that haven't been paid for
    if (validStatuses.cancelled && validStatuses.pending && seatPaymentStatusExists) {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      
      try {
        // For seat_bookings
        let query = `
          UPDATE "${schema}"."seat_bookings"
          SET status = '${actualStatusValues.cancelled}'`;
          
        // Only update payment_status if it exists
        if (seatPaymentStatusExists) {
          query += `, payment_status = 'cancelled'`;
        }
        
        query += `
          WHERE created_at < '${threeDaysAgo.toISOString()}'
            AND status = '${actualStatusValues.pending}'`;
            
        // Only check payment_status if it exists
        if (seatPaymentStatusExists) {
          query += ` AND payment_status = 'pending'`;
        }
        
        query += ` RETURNING id;`;
        
        const [cancelledBookings] = await sequelize.query(query);
        
        log(`✅ Cancelled ${cancelledBookings.length} pending seat bookings older than 3 days`, colors.green);
      } catch (error) {
        log(`⚠️ Could not cancel seat bookings: ${error.message}`, colors.yellow);
      }
      
      // For meeting_bookings
      if (meetingPaymentStatusExists) {
        try {
          let query = `
            UPDATE "${schema}"."meeting_bookings"
            SET status = '${actualStatusValues.cancelled}'`;
            
          // Only update payment_status if it exists
          if (meetingPaymentStatusExists) {
            query += `, payment_status = 'cancelled'`;
          }
          
          query += `
            WHERE created_at < '${threeDaysAgo.toISOString()}'
              AND status = '${actualStatusValues.pending}'`;
              
          // Only check payment_status if it exists
          if (meetingPaymentStatusExists) {
            query += ` AND payment_status = 'pending'`;
          }
          
          query += ` RETURNING id;`;
          
          const [cancelledMeetings] = await sequelize.query(query);
          
          log(`✅ Cancelled ${cancelledMeetings.length} pending meeting bookings older than 3 days`, colors.green);
        } catch (error) {
          log(`⚠️ Could not cancel meeting bookings: ${error.message}`, colors.yellow);
        }
      }
    } else {
      if (!validStatuses.cancelled || !validStatuses.pending) {
        log(`⚠️ Skipping cancel operations - 'pending' or 'cancelled' not valid enum values`, colors.yellow);
      }
      if (!seatPaymentStatusExists) {
        log(`⚠️ Skipping seat bookings cancel - payment_status column does not exist`, colors.yellow);
      }
      if (!meetingPaymentStatusExists) {
        log(`⚠️ Skipping meeting bookings cancel - payment_status column does not exist`, colors.yellow);
      }
    }
    
    // Update time slots for cancelled bookings if they exist
    if (validStatuses.cancelled) {
      try {
        // First check if time_slots table exists
        const [timeSlotCheck] = await sequelize.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_schema = '${schema}'
            AND table_name = 'time_slots'
          ) as exists;
        `);
        
        if (timeSlotCheck[0].exists) {
          const [updatedTimeSlots] = await sequelize.query(`
            UPDATE "${schema}"."time_slots"
            SET is_available = true, booking_id = NULL
            WHERE booking_id IN (
              SELECT id FROM "${schema}"."seat_bookings"
              WHERE status = '${actualStatusValues.cancelled}'
            )
            RETURNING id;
          `);
          
          log(`✅ Updated ${updatedTimeSlots.length} time slots for cancelled bookings`, colors.green);
        } else {
          log(`ℹ️ time_slots table does not exist, skipping time slot updates`, colors.blue);
        }
      } catch (error) {
        log(`⚠️ Could not update time slots: ${error.message}`, colors.yellow);
      }
    } else {
      log(`⚠️ Skipping time slot updates - 'cancelled' is not a valid enum value`, colors.yellow);
    }
    
    await sequelize.close();
    log('✅ All verifications completed successfully', colors.green);
  } catch (error) {
    log(`❌ Error running verifications: ${error.message}`, colors.red);
    console.error(error);
  }
}

// Fix database issues function
async function fixDatabaseIssues() {
  console.log('Checking and fixing database issues...');
  
  const sequelize = getSequelizeInstance();
  const schema = process.env.DB_SCHEMA || 'public';
  
  try {
    // Check if admins table exists
    const [adminTableExists] = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = '${schema}'
        AND table_name = 'admins'
      );
    `);
    
    // Create admins table if it doesn't exist
    if (!adminTableExists[0].exists) {
      console.log('Creating admins table...');
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS "${schema}"."admins" (
          id SERIAL PRIMARY KEY,
          username VARCHAR(50) NOT NULL UNIQUE,
          email VARCHAR(100) NOT NULL UNIQUE,
          password VARCHAR(255) NOT NULL,
          name VARCHAR(100) NOT NULL,
          role VARCHAR(20) NOT NULL DEFAULT 'staff',
          branch_id INTEGER NULL,
          permissions JSONB NULL,
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          last_login TIMESTAMP WITH TIME ZONE NULL,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('Admins table created successfully');
    }
    
    // Check if we need to create default admin
    const [adminCheck] = await sequelize.query(`
      SELECT COUNT(*) as count FROM "${schema}"."admins"
    `);
    
    if (parseInt(adminCheck[0].count) === 0) {
      console.log('Creating default admin user...');
      
      // Generate password hash
      const bcrypt = require('bcryptjs');
      const salt = bcrypt.genSaltSync(10);
      const hashedPassword = bcrypt.hashSync('Admin@123', salt);
      
      // Create default admin
      await sequelize.query(`
        INSERT INTO "${schema}"."admins" (
          username, email, password, name, role, permissions, is_active, created_at, updated_at
        ) VALUES (
          'admin',
          'admin@example.com',
          $1,
          'Admin User',
          'super_admin',
          $2,
          TRUE,
          NOW(),
          NOW()
        )
      `, {
        bind: [
          hashedPassword,
          JSON.stringify({
            seats: ['read', 'create', 'update', 'delete'],
            branches: ['read', 'create', 'update', 'delete'],
            bookings: ['read', 'create', 'update', 'delete'],
            customers: ['read', 'create', 'update', 'delete']
          })
        ]
      });
      
      console.log('Default admin created successfully');
    }
    
    // Check customers table for is_identity_verified column
    const [customersTableExists] = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = '${schema}'
        AND table_name = 'customers'
      );
    `);
    
    if (customersTableExists[0].exists) {
      // Check if is_identity_verified column exists
      const [columnExists] = await sequelize.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns
          WHERE table_schema = '${schema}'
          AND table_name = 'customers'
          AND column_name = 'is_identity_verified'
        );
      `);
      
      if (!columnExists[0].exists) {
        console.log('Adding is_identity_verified column to customers table...');
        await sequelize.query(`
          ALTER TABLE "${schema}"."customers"
          ADD COLUMN is_identity_verified BOOLEAN NOT NULL DEFAULT FALSE;
        `);
        console.log('Column added successfully');
      }
      
      // Fix customers with null or empty passwords
      console.log('Checking for customers with missing passwords...');
      const bcrypt = require('bcryptjs');
      const salt = bcrypt.genSaltSync(10);
      const defaultPassword = bcrypt.hashSync('Customer@123', salt);
      
      // Check for customers with null passwords
      const [customersWithNullPassword] = await sequelize.query(`
        SELECT id, email FROM "${schema}"."customers"
        WHERE password IS NULL OR password = '';
      `);
      
      if (customersWithNullPassword.length > 0) {
        console.log(`Found ${customersWithNullPassword.length} customers with missing passwords. Fixing...`);
        
        for (const customer of customersWithNullPassword) {
          await sequelize.query(`
            UPDATE "${schema}"."customers"
            SET password = $1, updated_at = NOW()
            WHERE id = $2;
          `, {
            bind: [defaultPassword, customer.id]
          });
          console.log(`Fixed password for customer ID ${customer.id} (${customer.email})`);
        }
        
        console.log('All missing customer passwords have been fixed');
      } else {
        console.log('No customers with missing passwords found');
      }
    }
    
    console.log('Database fix completed successfully');
    return true;
  } catch (error) {
    console.error('Error fixing database issues:', error);
    return false;
  }
}

// ===== MAIN SCRIPT RUNNER =====

async function main() {
  // Get command-line arguments
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (!command) {
    showHelp();
    return;
  }
  
  try {
    switch (command) {
      case 'migrations':
        // Import and run the migrations script
        require('./unified-migrations');
        break;
        
      case 'api-docs':
        await generateApiEndpointDocs();
        break;
        
      case 'api-test':
        if (args.length < 3) {
          log('❌ Missing required arguments for api-test', colors.red);
          log('Usage: node unified-scripts.js api-test <endpoint> <method> [data]', colors.yellow);
          return;
        }
        
        const endpoint = args[1];
        const method = args[2];
        const data = args[3] ? JSON.parse(args[3]) : null;
        
        await runApiTests(endpoint, method, data);
        break;
        
      case 'auth-fix':
        await fixAuthTokens();
        break;
        
      case 'verify':
        await runVerifications();
        break;
        
      case 'help':
      default:
        showHelp();
        break;
    }
  } catch (error) {
    log(`❌ Error executing command: ${error.message}`, colors.red);
    console.error(error);
    process.exit(1);
  }
}

function showHelp() {
  log(`${colors.bright}${colors.cyan}===== Unified Scripts Help =====`, colors.cyan);
  log('Usage: node unified-scripts.js [command] [options]\n');
  
  log('Available commands:', colors.yellow);
  log('  migrations             Run all database migrations');
  log('  api-docs               Generate API endpoint documentation');
  log('  api-test <endpoint> <method> [data]  Test an API endpoint');
  log('  auth-fix               Clean up expired authentication tokens');
  log('  verify                 Run verification checks on bookings');
  log('  help                   Show this help message');
  
  log('\nExamples:', colors.yellow);
  log('  node unified-scripts.js migrations');
  log('  node unified-scripts.js api-docs');
  log('  node unified-scripts.js api-test /customer/auth/login POST \'{"email":"test@example.com","password":"password"}\'');
  log('  node unified-scripts.js auth-fix');
  log('  node unified-scripts.js verify');
}

// Run the main function
if (require.main === module) {
  main().catch(error => {
    log(`❌ An unexpected error occurred: ${error.message}`, colors.red);
    process.exit(1);
  });
}

// Export the fix function for use in other scripts
module.exports = {
  fixDatabaseIssues,
  getSequelizeInstance
}; 