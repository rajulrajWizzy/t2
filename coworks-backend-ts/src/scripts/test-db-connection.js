#!/usr/bin/env node

/**
 * Simple script to test PostgreSQL database connection
 */

const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Get database configuration
const DB_NAME = process.env.DB_NAME || 'coworks_db';
const DB_USER = process.env.DB_USER || 'postgres';
// Better handling for empty password
const DB_PASS = process.env.DB_PASS === undefined ? '' : 
               (process.env.DB_PASS === '""' ? '' : process.env.DB_PASS);
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '5432', 10);
const DB_SCHEMA = process.env.DB_SCHEMA || 'excel_coworks_schema';

// Print connection info
console.log('Database Connection Test');
console.log('=======================');
console.log(`Database: ${DB_NAME}`);
console.log(`Schema: ${DB_SCHEMA}`);
console.log(`Host: ${DB_HOST}:${DB_PORT}`);
console.log(`User: ${DB_USER}`);
console.log(`Password length: ${DB_PASS ? DB_PASS.length : 0}`);
console.log(`Password type: ${typeof DB_PASS}`);
console.log('=======================\n');

// Fix for pg client to handle empty password
if (DB_PASS === '') {
  console.log('Note: Using empty password. PostgreSQL must be configured to allow this.');
}

// Create client config with explicit string password
const clientConfig = {
  user: DB_USER,
  password: typeof DB_PASS === 'string' ? DB_PASS : '',
  host: DB_HOST,
  port: DB_PORT,
  database: DB_NAME,
};

console.log('Connecting with config:', JSON.stringify({
  ...clientConfig,
  password: DB_PASS ? '<set>' : '<empty>'
}));

// Create a client
const client = new Client(clientConfig);

// Connect to the database
async function testConnection() {
  try {
    console.log('Attempting to connect to PostgreSQL...');
    await client.connect();
    console.log('✅ Connected to PostgreSQL successfully');

    // Test a simple query
    const res = await client.query('SELECT version()');
    console.log('PostgreSQL version:', res.rows[0].version);

    // Check if schema exists
    const schemaRes = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.schemata 
        WHERE schema_name = $1
      )
    `, [DB_SCHEMA]);
    
    const schemaExists = schemaRes.rows[0].exists;
    console.log(`Schema "${DB_SCHEMA}" exists: ${schemaExists ? '✅ Yes' : '❌ No'}`);

    // Create schema if it doesn't exist
    if (!schemaExists) {
      console.log(`Creating schema "${DB_SCHEMA}"...`);
      await client.query(`CREATE SCHEMA "${DB_SCHEMA}"`);
      console.log(`✅ Schema "${DB_SCHEMA}" created successfully`);
    }

    // Check admins table
    const tableRes = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = $1 AND table_name = 'admins'
      )
    `, [DB_SCHEMA]);
    
    const tableExists = tableRes.rows[0].exists;
    console.log(`Table "${DB_SCHEMA}.admins" exists: ${tableExists ? '✅ Yes' : '❌ No'}`);

    console.log('\n🎉 Database connection test completed successfully');
  } catch (error) {
    console.error('❌ Connection failed:', error);
    
    // Provide helpful guidance based on the error
    if (error.code === 'ECONNREFUSED') {
      console.error('\nPossible solutions:');
      console.error('1. Make sure PostgreSQL is running on your system');
      console.error(`2. Check if the server is accessible at ${DB_HOST}:${DB_PORT}`);
      console.error('3. Verify firewall settings are not blocking the connection');
    } else if (error.code === '28P01') {
      console.error('\nAuthentication failed:');
      console.error('1. Check your username and password in the .env file');
      console.error('2. Ensure the user has the necessary permissions');
    } else if (error.code === '3D000') {
      console.error('\nDatabase does not exist:');
      console.error(`1. Create the database "${DB_NAME}" first:`);
      console.error(`   CREATE DATABASE ${DB_NAME};`);
    } else if (error.message && error.message.includes('SASL')) {
      console.error('\nSASL authentication error:');
      console.error('1. Make sure DB_PASS in .env is correctly formatted');
      console.error('2. For empty password, use DB_PASS= (no quotes, no value)');
      console.error('3. Try setting explicit authentication method in pg_hba.conf');
      console.error('4. Current password value type:', typeof DB_PASS);
      
      // Add more detailed diagnostics
      console.error('\nDiagnostic info:');
      console.error('- DB_PASS environment variable:', process.env.DB_PASS === undefined ? '<undefined>' : 
                   (process.env.DB_PASS === '' ? '<empty string>' : '<non-empty string>'));
      console.error('- Processed DB_PASS:', DB_PASS === '' ? '<empty string>' : '<non-empty string>');
    }
  } finally {
    // Close the client
    await client.end().catch(err => console.error('Error closing client:', err));
  }
}

// Run the test
testConnection(); 