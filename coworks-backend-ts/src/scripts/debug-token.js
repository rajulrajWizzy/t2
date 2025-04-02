// Script to debug JWT token issues
const jwt = require('jsonwebtoken');
const { Sequelize } = require('sequelize');
require('dotenv').config();

// The token to debug
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTcsImVtYWlsIjoiY3VzdG9tZXI5QGNvd29ya3MuY29tIiwibmFtZSI6IlVzZXIgTmFtZSIsImlhdCI6MTc0MzQzODMyOCwiZXhwIjoxNzQzNTI0NzI4fQ.-J3mJ1xW-06NFiux9-3HLsqjoFkXBp0mHy5TcgvZENM';

// JWT secret from environment
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Database connection
const sequelize = new Sequelize(
  process.env.DATABASE_URL || 'postgres://postgres:password@localhost:5432/excel_coworks',
  {
    logging: false,
    schema: process.env.DB_SCHEMA || 'excel_coworks_schema'
  }
);

async function debugToken() {
  console.log('=== JWT Token Debugging ===');
  console.log('Token:', token);
  
  // Step 1: Decode the token without verification
  try {
    const decoded = jwt.decode(token);
    console.log('\n=== Decoded Token (without verification) ===');
    console.log(JSON.stringify(decoded, null, 2));
    
    // Check expiration
    if (decoded && decoded.exp) {
      const expiryDate = new Date(decoded.exp * 1000);
      const now = new Date();
      console.log('\n=== Expiration Check ===');
      console.log('Token expires at:', expiryDate.toISOString());
      console.log('Current time:', now.toISOString());
      console.log('Is expired:', expiryDate < now);
    }
  } catch (error) {
    console.error('Error decoding token:', error.message);
  }
  
  // Step 2: Check if token is blacklisted
  try {
    await sequelize.authenticate();
    console.log('\n=== Blacklist Check ===');
    
    const [results] = await sequelize.query(
      `SELECT id, token, expires_at, blacklisted_at FROM "excel_coworks_schema"."blacklisted_tokens" 
       WHERE token = :tokenValue 
       LIMIT 1`,
      { 
        replacements: { tokenValue: token },
        type: 'SELECT'
      }
    );
    
    if (results && results.length > 0) {
      console.log('Token IS blacklisted:', results[0]);
    } else {
      console.log('Token is NOT blacklisted');
    }
  } catch (dbError) {
    console.error('Database error checking blacklisted token:', dbError.message);
  }
  
  // Step 3: Verify the token
  try {
    console.log('\n=== Token Verification ===');
    const verified = jwt.verify(token, JWT_SECRET);
    console.log('Token verification successful:', JSON.stringify(verified, null, 2));
  } catch (verifyError) {
    console.error('Token verification failed:', verifyError.message);
    
    // Additional details for specific errors
    if (verifyError.name === 'TokenExpiredError') {
      console.log('Token expired at:', new Date(verifyError.expiredAt).toISOString());
    } else if (verifyError.name === 'JsonWebTokenError') {
      console.log('JWT Error:', verifyError.message);
    }
  }
  
  // Close database connection
  await sequelize.close();
}

// Run the debug function
debugToken()
  .then(() => console.log('\nDebugging complete'))
  .catch(err => console.error('Error during debugging:', err))
  .finally(() => process.exit(0));
