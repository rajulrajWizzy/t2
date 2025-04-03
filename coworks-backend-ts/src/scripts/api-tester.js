const fs = require('fs');
const path = require('path');
// Use the v2 import style for node-fetch
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const { spawn } = require('child_process');

// Configuration
const BASE_URL = 'http://localhost:3000';
const OUTPUT_DIR = path.join(__dirname, '..', '..', 'api-tests');
const POSTMAN_COLLECTION_PATH = path.join(OUTPUT_DIR, 'coworks-api-collection.json');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// API Endpoints to test
const API_ENDPOINTS = {
  auth: {
    login: {
      method: 'POST',
      path: '/api/auth/login',
      body: { email: 'user@example.com', password: 'password123' },
      description: 'User Login'
    },
    register: {
      method: 'POST',
      path: '/api/auth/register',
      body: { 
        name: 'Test User', 
        email: 'test@example.com', 
        password: 'password123',
        phone: '1234567890'
      },
      description: 'User Registration'
    },
    forgotPassword: {
      method: 'POST',
      path: '/api/auth/forgot-password',
      body: { email: 'user@example.com' },
      description: 'Forgot Password'
    },
    resetPassword: {
      method: 'POST',
      path: '/api/auth/reset-password',
      body: { token: 'reset_token', password: 'newpassword123' },
      description: 'Reset Password'
    },
    logout: {
      method: 'POST',
      path: '/api/auth/logout',
      requiresAuth: true,
      description: 'User Logout'
    }
  },
  admin: {
    login: {
      method: 'POST',
      path: '/api/admin/auth/login',
      body: { username: 'admin', password: 'admin123' },
      description: 'Admin Login'
    },
    dashboard: {
      method: 'GET',
      path: '/api/admin/dashboard/stats',
      requiresAdminAuth: true,
      description: 'Admin Dashboard Statistics'
    },
    users: {
      list: {
        method: 'GET',
        path: '/api/admin/users',
        requiresAdminAuth: true,
        description: 'List Users'
      },
      create: {
        method: 'POST',
        path: '/api/admin/users/create',
        requiresAdminAuth: true,
        body: {
          name: 'New User',
          email: 'newuser@example.com',
          password: 'password123',
          phone: '9876543210'
        },
        description: 'Create User'
      },
      getById: {
        method: 'GET',
        path: '/api/admin/users/{id}',
        requiresAdminAuth: true,
        params: { id: '1' },
        description: 'Get User by ID'
      }
    },
    profile: {
      get: {
        method: 'GET',
        path: '/api/admin/profile',
        requiresAdminAuth: true,
        description: 'Get Admin Profile'
      },
      update: {
        method: 'PUT',
        path: '/api/admin/profile/update',
        requiresAdminAuth: true,
        body: { name: 'Updated Admin Name' },
        description: 'Update Admin Profile'
      }
    }
  },
  branches: {
    list: {
      method: 'GET',
      path: '/api/branches',
      description: 'List Branches'
    },
    getById: {
      method: 'GET',
      path: '/api/branches/{id}',
      params: { id: '1' },
      description: 'Get Branch by ID'
    },
    getSeats: {
      method: 'GET',
      path: '/api/branches/{id}/seats',
      params: { id: '1' },
      description: 'Get Branch Seats'
    },
    stats: {
      method: 'GET',
      path: '/api/branches/stats',
      description: 'Get Branch Statistics',
      requiresAdminAuth: true
    }
  },
  slots: {
    list: {
      method: 'GET',
      path: '/api/slots',
      description: 'List All Slots'
    },
    available: {
      method: 'GET',
      path: '/api/slots/available',
      description: 'Get Available Slots'
    },
    categorized: {
      method: 'GET',
      path: '/api/slots/categorized',
      description: 'Get Categorized Slots'
    },
    branchSeating: {
      method: 'GET',
      path: '/api/slots/branch-seating',
      description: 'Get Branch Seating Slots'
    },
    seatingType: {
      method: 'GET',
      path: '/api/slots/seating-type',
      description: 'Get Slots by Seating Type'
    }
  },
  bookings: {
    create: {
      method: 'POST',
      path: '/api/bookings',
      requiresAuth: true,
      body: {
        slot_id: 1,
        booking_date: '2023-12-01',
        start_time: '09:00',
        end_time: '17:00'
      },
      description: 'Create Booking'
    },
    getById: {
      method: 'GET',
      path: '/api/bookings/{id}',
      requiresAuth: true,
      params: { id: '1' },
      description: 'Get Booking by ID'
    },
    list: {
      method: 'GET',
      path: '/api/bookings',
      requiresAuth: true,
      description: 'List User Bookings'
    }
  },
  profile: {
    get: {
      method: 'GET',
      path: '/api/profile',
      requiresAuth: true,
      description: 'Get User Profile'
    },
    upload: {
      method: 'POST',
      path: '/api/profile/upload',
      requiresAuth: true,
      formData: true,
      description: 'Upload Profile Picture'
    },
    verificationStatus: {
      method: 'GET',
      path: '/api/profile/verification-status',
      requiresAuth: true,
      description: 'Get Verification Status'
    }
  }
};

// Credentials storage for authentication
let userToken = null;
let adminToken = null;

// Test results
const testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  details: []
};

// Postman collection template
const postmanCollection = {
  info: {
    name: 'CoWorks API Collection',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
  },
  item: []
};

/**
 * Format request URL with parameters
 */
function formatUrl(baseUrl, path, params = {}) {
  let url = path;
  
  // Replace path parameters
  for (const [key, value] of Object.entries(params)) {
    url = url.replace(`{${key}}`, value);
  }
  
  return `${baseUrl}${url}`;
}

/**
 * Make a request to an API endpoint
 */
async function makeRequest(endpoint, authToken = null) {
  const url = formatUrl(BASE_URL, endpoint.path, endpoint.params);
  console.log(`Testing ${endpoint.method} ${url}`);
  
  try {
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    const options = {
      method: endpoint.method,
      headers
    };
    
    if (endpoint.body && (endpoint.method === 'POST' || endpoint.method === 'PUT' || endpoint.method === 'PATCH')) {
      options.body = JSON.stringify(endpoint.body);
    }
    
    const response = await fetch(url, options);
    const statusCode = response.status;
    
    let responseData;
    try {
      responseData = await response.json();
    } catch (e) {
      responseData = { error: 'Could not parse response as JSON' };
    }
    
    const success = statusCode >= 200 && statusCode < 300;
    
    // Store test result
    testResults.total++;
    if (success) {
      testResults.passed++;
    } else {
      testResults.failed++;
    }
    
    testResults.details.push({
      endpoint: endpoint.path,
      method: endpoint.method,
      status: statusCode,
      success,
      response: responseData
    });
    
    console.log(`  Status: ${statusCode} - ${success ? 'PASSED' : 'FAILED'}`);
    
    return {
      success,
      status: statusCode,
      data: responseData
    };
  } catch (error) {
    console.error(`  Error testing ${endpoint.method} ${url}:`, error.message);
    
    testResults.total++;
    testResults.failed++;
    
    testResults.details.push({
      endpoint: endpoint.path,
      method: endpoint.method,
      success: false,
      error: error.message
    });
    
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Add endpoint to Postman collection
 */
function addToPostmanCollection(endpoint, folderName) {
  // Find or create folder
  let folder = postmanCollection.item.find(item => item.name === folderName);
  if (!folder) {
    folder = {
      name: folderName,
      item: []
    };
    postmanCollection.item.push(folder);
  }
  
  // Create request item
  const requestItem = {
    name: endpoint.description || `${endpoint.method} ${endpoint.path}`,
    request: {
      method: endpoint.method,
      header: [
        {
          key: 'Content-Type',
          value: 'application/json'
        }
      ],
      url: {
        raw: `{{baseUrl}}${endpoint.path}`,
        host: ['{{baseUrl}}'],
        path: endpoint.path.split('/').filter(p => p)
      }
    }
  };
  
  // Add authentication if required
  if (endpoint.requiresAuth || endpoint.requiresAdminAuth) {
    requestItem.request.header.push({
      key: 'Authorization',
      value: 'Bearer {{' + (endpoint.requiresAdminAuth ? 'adminToken' : 'userToken') + '}}'
    });
  }
  
  // Add body if needed
  if (endpoint.body && (endpoint.method === 'POST' || endpoint.method === 'PUT' || endpoint.method === 'PATCH')) {
    requestItem.request.body = {
      mode: 'raw',
      raw: JSON.stringify(endpoint.body, null, 2),
      options: {
        raw: {
          language: 'json'
        }
      }
    };
  }
  
  // Add to folder
  folder.item.push(requestItem);
}

/**
 * Generate Postman collection from API endpoints
 */
function generatePostmanCollection() {
  // Add environment variables
  const postmanEnvironment = {
    name: 'CoWorks API Environment',
    values: [
      {
        key: 'baseUrl',
        value: BASE_URL,
        type: 'string'
      },
      {
        key: 'userToken',
        value: '',
        type: 'string'
      },
      {
        key: 'adminToken',
        value: '',
        type: 'string'
      }
    ]
  };
  
  // Add all endpoints
  for (const [category, endpoints] of Object.entries(API_ENDPOINTS)) {
    if (typeof endpoints === 'object' && !Array.isArray(endpoints)) {
      for (const [name, endpoint] of Object.entries(endpoints)) {
        if (endpoint.path) {
          addToPostmanCollection(endpoint, category);
        } else {
          // Handle nested endpoints
          for (const [subName, subEndpoint] of Object.entries(endpoint)) {
            addToPostmanCollection(subEndpoint, `${category} - ${name}`);
          }
        }
      }
    }
  }
  
  // Write collection to file
  fs.writeFileSync(
    POSTMAN_COLLECTION_PATH, 
    JSON.stringify(postmanCollection, null, 2)
  );
  
  // Write environment to file
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'coworks-api-environment.json'),
    JSON.stringify(postmanEnvironment, null, 2)
  );
  
  console.log(`Postman collection saved to ${POSTMAN_COLLECTION_PATH}`);
  console.log(`Postman environment saved to ${path.join(OUTPUT_DIR, 'coworks-api-environment.json')}`);
}

/**
 * Generate curl commands for each endpoint
 */
function generateCurlCommands() {
  const curlCommands = [];
  
  for (const [category, endpoints] of Object.entries(API_ENDPOINTS)) {
    if (typeof endpoints === 'object' && !Array.isArray(endpoints)) {
      for (const [name, endpoint] of Object.entries(endpoints)) {
        if (endpoint.path) {
          const curl = generateCurlForEndpoint(endpoint, category, name);
          if (curl) curlCommands.push(curl);
        } else {
          // Handle nested endpoints
          for (const [subName, subEndpoint] of Object.entries(endpoint)) {
            const curl = generateCurlForEndpoint(subEndpoint, category, `${name}_${subName}`);
            if (curl) curlCommands.push(curl);
          }
        }
      }
    }
  }
  
  // Write curl commands to file
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'curl-commands.sh'),
    '#!/bin/bash\n\n' + curlCommands.join('\n\n')
  );
  
  console.log(`Curl commands saved to ${path.join(OUTPUT_DIR, 'curl-commands.sh')}`);
}

/**
 * Generate curl command for a single endpoint
 */
function generateCurlForEndpoint(endpoint, category, name) {
  try {
    let url = formatUrl(BASE_URL, endpoint.path, endpoint.params);
    let curl = `# ${endpoint.description || `${endpoint.method} ${endpoint.path}`}\n`;
    curl += `curl -X ${endpoint.method} "${url}"`;
    
    // Add headers
    curl += ' -H "Content-Type: application/json"';
    if (endpoint.requiresAuth) {
      curl += ' -H "Authorization: Bearer $USER_TOKEN"';
    } else if (endpoint.requiresAdminAuth) {
      curl += ' -H "Authorization: Bearer $ADMIN_TOKEN"';
    }
    
    // Add body if needed
    if (endpoint.body && (endpoint.method === 'POST' || endpoint.method === 'PUT' || endpoint.method === 'PATCH')) {
      curl += ` -d '${JSON.stringify(endpoint.body)}'`;
    }
    
    return curl;
  } catch (error) {
    console.error(`Error generating curl command for ${category}.${name}:`, error);
    return null;
  }
}

/**
 * Run all API tests
 */
async function runTests() {
  console.log('=== Starting API Tests ===');
  console.log(`Base URL: ${BASE_URL}`);
  
  // First authenticate to get tokens
  try {
    // User login
    console.log('\n--- User Authentication ---');
    const userLoginResult = await makeRequest(API_ENDPOINTS.auth.login);
    if (userLoginResult.success && userLoginResult.data && userLoginResult.data.token) {
      userToken = userLoginResult.data.token;
      console.log('  User authenticated successfully');
    } else {
      console.log('  Failed to authenticate user');
    }
    
    // Admin login
    console.log('\n--- Admin Authentication ---');
    const adminLoginResult = await makeRequest(API_ENDPOINTS.admin.login);
    if (adminLoginResult.success && adminLoginResult.data && adminLoginResult.data.data && adminLoginResult.data.data.token) {
      adminToken = adminLoginResult.data.data.token;
      console.log('  Admin authenticated successfully');
    } else {
      console.log('  Failed to authenticate admin');
    }
    
    // Test all user endpoints
    console.log('\n--- User Endpoints ---');
    for (const [category, endpoints] of Object.entries(API_ENDPOINTS)) {
      if (category !== 'admin' && typeof endpoints === 'object' && !Array.isArray(endpoints)) {
        for (const [name, endpoint] of Object.entries(endpoints)) {
          if (endpoint.path) {
            await testEndpoint(endpoint, category, name);
          } else {
            // Handle nested endpoints
            for (const [subName, subEndpoint] of Object.entries(endpoint)) {
              await testEndpoint(subEndpoint, category, `${name}_${subName}`);
            }
          }
        }
      }
    }
    
    // Test all admin endpoints
    console.log('\n--- Admin Endpoints ---');
    for (const [name, endpoint] of Object.entries(API_ENDPOINTS.admin)) {
      if (endpoint.path) {
        await testEndpoint(endpoint, 'admin', name);
      } else {
        // Handle nested endpoints
        for (const [subName, subEndpoint] of Object.entries(endpoint)) {
          await testEndpoint(subEndpoint, 'admin', `${name}_${subName}`);
        }
      }
    }
    
    // Generate test report
    generateTestReport();
    
    // Generate Postman collection
    generatePostmanCollection();
    
    // Generate curl commands
    generateCurlCommands();
    
  } catch (error) {
    console.error('Error running tests:', error);
  }
}

/**
 * Test a single endpoint
 */
async function testEndpoint(endpoint, category, name) {
  console.log(`\nTesting ${category}.${name} (${endpoint.method} ${endpoint.path})`);
  
  let token = null;
  if (endpoint.requiresAuth && userToken) {
    token = userToken;
  } else if (endpoint.requiresAdminAuth && adminToken) {
    token = adminToken;
  }
  
  await makeRequest(endpoint, token);
}

/**
 * Generate test report
 */
function generateTestReport() {
  const reportPath = path.join(OUTPUT_DIR, 'test-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
  
  console.log('\n=== Test Report ===');
  console.log(`Total Tests: ${testResults.total}`);
  console.log(`Passed: ${testResults.passed}`);
  console.log(`Failed: ${testResults.failed}`);
  console.log(`Success Rate: ${Math.round((testResults.passed / testResults.total) * 100)}%`);
  console.log(`Report saved to ${reportPath}`);
}

// Function to start the server and run tests
async function startServerAndRunTests() {
  console.log('Starting Next.js development server...');
  
  // Check if server is already running
  try {
    const response = await fetch(`${BASE_URL}/api/status`);
    if (response.ok) {
      console.log('Server is already running, proceeding with tests...');
      runTests();
      return;
    }
  } catch (error) {
    console.log('Server is not running, starting it now...');
  }
  
  // Start the server
  const server = spawn('npm', ['run', 'dev'], {
    shell: true,
    stdio: 'pipe',
    detached: false
  });
  
  let serverStarted = false;
  
  server.stdout.on('data', (data) => {
    const output = data.toString();
    console.log(`Server: ${output.trim()}`);
    
    // Check if server is ready
    if (output.includes('Ready in') && !serverStarted) {
      serverStarted = true;
      console.log('Server started, waiting 5 seconds before running tests...');
      
      // Wait a bit to make sure server is fully ready
      setTimeout(() => {
        runTests();
      }, 5000);
    }
  });
  
  server.stderr.on('data', (data) => {
    console.error(`Server Error: ${data.toString().trim()}`);
  });
  
  server.on('close', (code) => {
    console.log(`Server process exited with code ${code}`);
  });
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('Shutting down server...');
    if (server && !server.killed) {
      process.kill(-server.pid);
    }
    process.exit();
  });
}

// If this script is run directly
if (require.main === module) {
  const skipServerStart = process.argv.includes('--no-server');
  
  if (skipServerStart) {
    console.log('Skipping server start, assuming server is already running...');
    runTests();
  } else {
    startServerAndRunTests();
  }
} 