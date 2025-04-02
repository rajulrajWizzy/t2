// Test script to test API routes
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const BASE_URL = 'http://localhost:3000/api';

// Helper to make API requests
async function makeRequest(endpoint, method = 'GET', body = null, token = null) {
  const headers = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const options = {
    method,
    headers,
  };
  
  if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    options.body = JSON.stringify(body);
  }
  
  console.log(`Making ${method} request to ${endpoint}`);
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    console.log(`Status: ${response.status}`);
    
    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
      console.log('Response:', JSON.stringify(data, null, 2));
    } else {
      const text = await response.text();
      console.log('Response (not JSON):', text);
      
      // Try to parse as JSON anyway, but handle failures
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        console.log('Could not parse response as JSON');
        data = { success: false, message: text };
      }
    }
    
    return { status: response.status, data };
  } catch (error) {
    console.error(`Error making request to ${endpoint}:`, error);
    return { error: error.message };
  }
}

// Test functions
async function testAdminLogin() {
  console.log('\n=== Testing Admin Login ===');
  return makeRequest('/admin/auth/login', 'POST', {
    username: 'admin',
    password: 'Admin@123'
  });
}

async function testUserRegistration() {
  console.log('\n=== Testing User Registration ===');
  return makeRequest('/auth/register', 'POST', {
    name: 'Test User',
    email: 'testuser@example.com',
    password: 'TestPassword123!',
    company_name: 'Test Company'
  });
}

async function testUserLogin() {
  console.log('\n=== Testing User Login ===');
  return makeRequest('/auth/login', 'POST', {
    email: 'testuser@example.com',
    password: 'TestPassword123!'
  });
}

async function testGetProfile(token) {
  console.log('\n=== Testing Get Profile ===');
  return makeRequest('/profile', 'GET', null, token);
}

async function testUpdateProfile(token) {
  console.log('\n=== Testing Update Profile ===');
  return makeRequest('/profile', 'PATCH', {
    name: 'Updated Test User',
    company_name: 'Updated Test Company'
  }, token);
}

// Run tests
async function runTests() {
  console.log('Starting API tests...');
  
  try {
    // Test admin login
    const adminLoginResult = await testAdminLogin();
    if (adminLoginResult.error || !adminLoginResult.data.success) {
      console.error('Admin login failed:', adminLoginResult.error || adminLoginResult.data.message);
    } else {
      console.log('Admin login successful');
      const adminToken = adminLoginResult.data.data.token;
      
      // Here we could test admin-specific endpoints
    }
    
    // Test user registration
    const registrationResult = await testUserRegistration();
    if (registrationResult.error || !registrationResult.data.success) {
      console.log('User registration failed (may already exist):', 
        registrationResult.error || registrationResult.data.message);
    } else {
      console.log('User registration successful');
    }
    
    // Test user login
    const userLoginResult = await testUserLogin();
    if (userLoginResult.error || !userLoginResult.data.success) {
      console.error('User login failed:', userLoginResult.error || userLoginResult.data.message);
    } else {
      console.log('User login successful');
      const userToken = userLoginResult.data.data.token;
      
      // Test profile endpoints with the user token
      const profileResult = await testGetProfile(userToken);
      if (profileResult.error || !profileResult.data.success) {
        console.error('Get profile failed:', profileResult.error || profileResult.data.message);
      } else {
        console.log('Profile fetched successfully');
      }
      
      // Test update profile
      const updateResult = await testUpdateProfile(userToken);
      if (updateResult.error || !updateResult.data.success) {
        console.error('Update profile failed:', updateResult.error || updateResult.data.message);
      } else {
        console.log('Profile updated successfully');
      }
    }
  } catch (error) {
    console.error('Test execution error:', error);
  }
  
  console.log('\nAPI tests completed.');
}

// Run the tests
runTests(); 