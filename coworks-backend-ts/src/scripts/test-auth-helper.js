// Test script for auth-helper functions
// Run with: node src/scripts/test-auth-helper.js

const axios = require('axios');

// Base URL - adjust as needed for your environment
const BASE_URL = 'http://localhost:3001';

// Test admin credentials
const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'Admin@123'
};

// Helper to log results
function logResult(label, success, message, data = null) {
  const statusText = success ? 'SUCCESS' : 'FAILED';
  
  console.log(`\n${label}: ${statusText}`);
  console.log(`Message: ${message}`);
  
  if (data) {
    console.log(`Data: ${typeof data === 'string' ? data : JSON.stringify(data, null, 2)}`);
  }
}

// Helper to make API requests
async function makeRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  console.log(`Making request to: ${url}`);
  
  try {
    const response = await axios({
      url,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      data: options.body,
      validateStatus: () => true // Don't throw on error status codes
    });
    
    return {
      status: response.status,
      ok: response.status >= 200 && response.status < 300,
      data: response.data
    };
  } catch (error) {
    console.error(`Request error for ${endpoint}:`, error);
    return {
      status: 0,
      ok: false,
      data: { message: error.message }
    };
  }
}

// Test Functions
async function testAdminLogin() {
  const result = await makeRequest('/api/admin/auth/login', {
    method: 'POST',
    body: ADMIN_CREDENTIALS
  });
  
  logResult(
    'Admin Login', 
    result.ok, 
    result.ok ? 'Successfully logged in as admin' : `Login failed: ${result.data.message}`,
    result.data
  );
  
  if (result.ok) {
    return result.data.data.token;
  }
  return null;
}

async function testProfileAccess(token) {
  if (!token) {
    logResult('Profile Access', false, 'No token available, skipping test');
    return;
  }
  
  const result = await makeRequest('/api/profile', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  logResult(
    'Profile Access', 
    result.ok, 
    result.ok ? 'Successfully accessed profile' : `Profile access failed: ${result.data.message}`,
    result.ok ? { status: result.status } : result.data
  );
}

async function testAdminDashboard(token) {
  if (!token) {
    logResult('Admin Dashboard', false, 'No token available, skipping test');
    return;
  }
  
  const result = await makeRequest('/api/admin/dashboard/stats', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  logResult(
    'Admin Dashboard', 
    result.ok, 
    result.ok ? 'Successfully accessed admin dashboard' : `Admin dashboard access failed: ${result.data.message}`,
    result.ok ? { status: result.status } : result.data
  );
}

// Main test flow
async function runTests() {
  console.log('\n===== AUTH HELPER TEST SCRIPT =====\n');
  
  try {
    // Test 1: Admin Login
    const adminToken = await testAdminLogin();
    
    // Test 2: Profile Access with Admin Token
    await testProfileAccess(adminToken);
    
    // Test 3: Admin Dashboard Access
    await testAdminDashboard(adminToken);
    
    console.log('\n===== TEST SCRIPT COMPLETED =====\n');
  } catch (error) {
    console.error('\nTest execution error:', error);
  }
}

// Run the tests
runTests(); 