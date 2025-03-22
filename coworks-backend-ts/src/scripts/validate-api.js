// Use the v2 import style for node-fetch
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const fs = require('fs');
const path = require('path');

async function testEndpoint() {
  try {
    // Check if the server is running
    console.log('Testing API endpoint: /api/admin/auth/login');
    
    const response = await fetch('http://localhost:3000/api/admin/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'test123'
      })
    });
    
    const status = response.status;
    console.log('Status code:', status);
    
    // Clone the response before using it
    const responseClone = response.clone();
    
    // Try to parse the response as JSON
    try {
      const data = await response.json();
      console.log('Response data:', JSON.stringify(data, null, 2));
    } catch (e) {
      console.log('Response is not JSON. Text content:');
      const text = await responseClone.text();
      console.log(text.substring(0, 500) + '...');
    }
    
    // Check API routes folder structure
    console.log('\nChecking API routes file structure:');
    const apiPath = path.join(__dirname, '..', 'app', 'api', 'admin', 'auth', 'login');
    
    if (fs.existsSync(apiPath)) {
      console.log(`API path exists: ${apiPath}`);
      const files = fs.readdirSync(apiPath);
      console.log('Files in directory:', files);
      
      const routeFile = path.join(apiPath, 'route.ts');
      if (fs.existsSync(routeFile)) {
        console.log(`Route file exists: ${routeFile}`);
        const content = fs.readFileSync(routeFile, 'utf8');
        console.log('First 200 characters of route file:');
        console.log(content.substring(0, 200) + '...');
      } else {
        console.error('Route file does not exist!');
      }
    } else {
      console.error('API path does not exist!');
    }
    
  } catch (error) {
    console.error('Error testing endpoint:', error);
  }
}

testEndpoint(); 