#!/usr/bin/env node

/**
 * Script to test the user profile API endpoints
 * Run with: node src/scripts/test-profile-api.js
 */

const fetch = require('node-fetch');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Configuration - change as needed
const BASE_URL = process.env.API_URL || 'http://localhost:3000';
const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'Test@123';
const COLORS = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
};

// Helper to print colored output
const print = {
  info: (msg) => console.log(`${COLORS.blue}[INFO]${COLORS.reset} ${msg}`),
  success: (msg) => console.log(`${COLORS.green}[SUCCESS]${COLORS.reset} ${msg}`),
  error: (msg) => console.log(`${COLORS.red}[ERROR]${COLORS.reset} ${msg}`),
  warning: (msg) => console.log(`${COLORS.yellow}[WARNING]${COLORS.reset} ${msg}`),
  header: (msg) => console.log(`\n${COLORS.cyan}=== ${msg} ===${COLORS.reset}`),
};

// Helper for API requests
async function apiRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  
  const defaultOptions = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  const requestOptions = { ...defaultOptions, ...options };
  print.info(`${requestOptions.method} ${url}`);
  
  try {
    const response = await fetch(url, requestOptions);
    const data = await response.json();
    
    if (response.ok) {
      print.success(`Status: ${response.status} ${response.statusText}`);
    } else {
      print.error(`Status: ${response.status} ${response.statusText}`);
    }
    
    return { success: response.ok, status: response.status, data };
  } catch (error) {
    print.error(`Request failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Main testing function
async function runTests() {
  print.header('Starting Profile API Tests');
  
  // Step 1: Login to get authentication token
  print.header('Step 1: User Login');
  const loginResult = await apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    }),
  });
  
  if (!loginResult.success) {
    print.error('Login failed. Cannot proceed with tests.');
    print.error(JSON.stringify(loginResult.data, null, 2));
    return;
  }
  
  const token = loginResult.data.data.token;
  print.success(`Retrieved token: ${token.substring(0, 15)}...`);
  
  const authHeader = { Authorization: `Bearer ${token}` };
  
  // Step 2: Get current profile
  print.header('Step 2: Get Current Profile');
  const profileResult = await apiRequest('/api/profile', {
    headers: {
      ...authHeader,
    },
  });
  
  if (!profileResult.success) {
    print.error('Failed to retrieve profile');
    print.error(JSON.stringify(profileResult.data, null, 2));
    return;
  }
  
  print.success('Profile retrieved successfully');
  const currentProfile = profileResult.data.data;
  console.log(JSON.stringify(currentProfile, null, 2));
  
  // Step 3: Update profile with new endpoint
  print.header('Step 3: Update Profile with New Endpoint');
  const updatedName = `Test User ${Date.now()}`;
  const updateResult = await apiRequest('/api/profile/update', {
    method: 'PUT',
    headers: {
      ...authHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: updatedName,
      company_name: 'Updated Test Company',
      address: '123 Test Street, Test City, Test Country',
    }),
  });
  
  if (!updateResult.success) {
    print.error('Failed to update profile');
    print.error(JSON.stringify(updateResult.data, null, 2));
    return;
  }
  
  print.success('Profile updated successfully');
  console.log(JSON.stringify(updateResult.data, null, 2));
  
  // Step 4: Verify updates worked by getting profile again
  print.header('Step 4: Verify Profile Updates');
  const verifyResult = await apiRequest('/api/profile', {
    headers: {
      ...authHeader,
    },
  });
  
  if (!verifyResult.success) {
    print.error('Failed to retrieve updated profile');
    print.error(JSON.stringify(verifyResult.data, null, 2));
    return;
  }
  
  if (verifyResult.data.data.name === updatedName) {
    print.success(`Profile name updated successfully to: ${updatedName}`);
  } else {
    print.error(`Profile name update failed. Expected: ${updatedName}, Got: ${verifyResult.data.data.name}`);
  }
  
  print.header('Tests Completed');
}

// Run tests
runTests().catch(error => {
  console.error('Test script error:', error);
  process.exit(1);
}); 