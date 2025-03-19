// check-schema.js
require('dotenv').config();
const { Pool } = require('pg');

const config = process.env.DATABASE_URL 
  ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
  : {
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
    };

const pool = new Pool(config);

async function checkSchema() {
  try {
    console.log('Connected to database. Checking schema information...');
    
    // Get current user
    const userResult = await pool.query('SELECT current_user;');
    const currentUser = userResult.rows[0].current_user;
    console.log('Current database user:', currentUser);
    
    // Get schema list
    const result = await pool.query(`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name NOT LIKE 'pg_%' 
      AND schema_name != 'information_schema'
    `);
    
    console.log('\nAvailable schemas:');
    result.rows.forEach(row => {
      console.log(`- ${row.schema_name}`);
    });
    
    // Get schema creation privileges
    try {
      // Create a test schema named after the user
      await pool.query(`CREATE SCHEMA IF NOT EXISTS ${currentUser}`);
      console.log(`\nSuccessfully created/confirmed schema "${currentUser}"`);
      console.log(`You have permission to create schemas!`);
    } catch (e) {
      console.log('\nFailed to create a schema:', e.message);
      console.log('You may not have schema creation privileges');
    }
    
    // Check current search path
    const pathResult = await pool.query('SHOW search_path;');
    console.log('\nCurrent search path:', pathResult.rows[0].search_path);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkSchema();