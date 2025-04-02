// Test script for API endpoints
const fetch = require('node-fetch');

// Configuration
const BASE_URL = 'http://localhost:3000';
const TEST_CREDENTIALS = {
  username: 'admin',
  password: 'password'
};

async function testEndpoints() {
  try {
    console.log('Testing API endpoints...');
    
    // Step 1: Login to get token
    console.log('\n1. Testing admin login...');
    const loginResponse = await fetch(`${BASE_URL}/api/admin/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(TEST_CREDENTIALS)
    });
    
    const loginData = await loginResponse.json();
    console.log('Login response:', loginData);
    
    if (!loginData.success || !loginData.data.token) {
      console.error('Login failed, cannot continue tests');
      return;
    }
    
    const token = loginData.data.token;
    console.log('Successfully got token:', token.substring(0, 15) + '...');
    
    // Step 2: Test branches endpoint
    console.log('\n2. Testing branches endpoint...');
    const branchesResponse = await fetch(`${BASE_URL}/api/branches`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const branchesData = await branchesResponse.json();
    console.log('Branches response status:', branchesResponse.status);
    console.log('Branches response:', JSON.stringify(branchesData, null, 2).substring(0, 500) + '...');
    
    // Step 3: Test seating-types endpoint
    console.log('\n3. Testing seating-types endpoint...');
    const seatingTypesResponse = await fetch(`${BASE_URL}/api/seating-types`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const seatingTypesData = await seatingTypesResponse.json();
    console.log('Seating types response status:', seatingTypesResponse.status);
    console.log('Seating types response:', JSON.stringify(seatingTypesData, null, 2).substring(0, 500) + '...');
    
    // Step 4: Test profile endpoint
    console.log('\n4. Testing profile endpoint...');
    const profileResponse = await fetch(`${BASE_URL}/api/profile`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const profileData = await profileResponse.json();
    console.log('Profile response status:', profileResponse.status);
    console.log('Profile response:', JSON.stringify(profileData, null, 2).substring(0, 500) + '...');
    
    console.log('\nAll tests completed.');
  } catch (error) {
    console.error('Error testing endpoints:', error);
  }
}

// Run the tests
testEndpoints(); 