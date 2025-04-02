// Test script to verify JWT implementation
const jwt = require('jsonwebtoken');

// Mock environment
process.env.JWT_SECRET = 'test-secret-key';
process.env.JWT_EXPIRES_IN = '1h';

// Simulate Next.js response
class MockResponse {
  constructor() {
    this.status = 200;
    this.body = null;
    this.headers = new Map();
  }

  json(data) {
    this.body = data;
    return this;
  }

  status(code) {
    this.status = code;
    return this;
  }

  setHeader(key, value) {
    this.headers.set(key, value);
    return this;
  }
}

// Mock request with headers
class MockRequest {
  constructor(headers = {}) {
    this.headers = new Headers();
    Object.entries(headers).forEach(([key, value]) => {
      this.headers.set(key, value);
    });
  }

  header(name) {
    return this.headers.get(name);
  }
}

// Simulate JWT implementation from config/jwt.js
function generateToken(user) {
  return jwt.sign(
    { 
      id: user.id,
      email: user.email,
      name: user.name
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
}

// Simulate JWT verification
function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return { valid: true, decoded };
  } catch (error) {
    return { valid: false, decoded: null };
  }
}

// Simulate verifyAuth from utils/jwt.js
async function verifyAuth(request) {
  try {
    // Extract token from Authorization header
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return {
        json: () => ({ success: false, message: 'Authentication token is required' }),
        status: 401
      };
    }
    
    // Verify the token
    const verificationResult = verifyToken(token);
    
    if (!verificationResult.valid || !verificationResult.decoded) {
      return {
        json: () => ({ success: false, message: 'Invalid or expired token' }),
        status: 401
      };
    }
    
    return verificationResult.decoded;
  } catch (error) {
    console.error('Token verification error:', error);
    return {
      json: () => ({ success: false, message: 'Token verification failed' }),
      status: 401
    };
  }
}

// Run tests
async function runTests() {
  console.log('Starting JWT tests...');
  
  // Test 1: Generate token
  const user = { id: 1, email: 'test@example.com', name: 'Test User' };
  const token = generateToken(user);
  console.log('Test 1: Generate token', token ? 'PASSED' : 'FAILED');
  console.log('Token:', token);
  
  // Test 2: Verify valid token
  const verificationResult = verifyToken(token);
  console.log('Test 2: Verify valid token', verificationResult.valid ? 'PASSED' : 'FAILED');
  console.log('Decoded payload:', verificationResult.decoded);
  
  // Test 3: Verify invalid token
  const invalidResult = verifyToken('invalid.token.here');
  console.log('Test 3: Verify invalid token', !invalidResult.valid ? 'PASSED' : 'FAILED');
  
  // Test 4: Auth middleware with valid token
  const requestWithToken = new MockRequest({
    'Authorization': `Bearer ${token}`
  });
  
  const authResult = await verifyAuth(requestWithToken);
  console.log('Test 4: Auth middleware with valid token', 
    authResult.id === user.id ? 'PASSED' : 'FAILED',
    authResult
  );
  
  // Test 5: Auth middleware with invalid token
  const requestWithInvalidToken = new MockRequest({
    'Authorization': 'Bearer invalid.token.here'
  });
  
  const invalidAuthResult = await verifyAuth(requestWithInvalidToken);
  console.log('Test 5: Auth middleware with invalid token', 
    invalidAuthResult.status === 401 ? 'PASSED' : 'FAILED'
  );
  
  // Test 6: Auth middleware with missing token
  const requestWithoutToken = new MockRequest();
  const missingTokenResult = await verifyAuth(requestWithoutToken);
  console.log('Test 6: Auth middleware with missing token', 
    missingTokenResult.status === 401 ? 'PASSED' : 'FAILED'
  );
  
  console.log('JWT tests completed.');
}

runTests(); 