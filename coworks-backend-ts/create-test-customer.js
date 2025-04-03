/**
 * Create Test Customer
 * This script adds a test customer with known credentials to the database
 */

const { Sequelize } = require('sequelize');
const bcrypt = require('bcryptjs');

// Database connection settings
const database = process.env.DB_NAME || 'excel_coworks';
const username = process.env.DB_USER || 'postgres';
const password = process.env.DB_PASS || 'postgres';
const host = process.env.DB_HOST || 'localhost';
const port = process.env.DB_PORT || 5432;
const schema = process.env.DB_SCHEMA || 'excel_coworks_schema';

// Test customer credentials
const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'Test@123';
const TEST_NAME = 'Test User';
const TEST_COMPANY = 'Test Company';

console.log('='.repeat(50));
console.log('CREATE TEST CUSTOMER');
console.log('='.repeat(50));
console.log(`Database: ${database}`);
console.log(`Schema: ${schema}`);
console.log(`Test Email: ${TEST_EMAIL}`);
console.log(`Test Password: ${TEST_PASSWORD}`);
console.log('-'.repeat(50));

// Create Sequelize instance
const sequelize = new Sequelize(database, username, password, {
  host: host,
  port: port,
  dialect: 'postgres',
  logging: false,
});

// Function to create a test customer
async function createTestCustomer() {
  try {
    // Test the database connection
    console.log('Testing database connection...');
    await sequelize.authenticate();
    console.log('✅ Connection established successfully.');

    // First ensure the customers table exists
    console.log('Ensuring customers table exists...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "${schema}"."customers" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" VARCHAR(100) NOT NULL,
        "email" VARCHAR(100) NOT NULL UNIQUE,
        "phone" VARCHAR(20),
        "password" VARCHAR(255) NOT NULL,
        "profile_picture" VARCHAR(255),
        "company_name" VARCHAR(100),
        "proof_of_identity" VARCHAR(255),
        "proof_of_address" VARCHAR(255),
        "address" TEXT,
        "is_identity_verified" BOOLEAN NOT NULL DEFAULT FALSE,
        "is_address_verified" BOOLEAN NOT NULL DEFAULT FALSE,
        "verification_status" VARCHAR(20) NOT NULL DEFAULT 'APPROVED',
        "verification_notes" TEXT,
        "verification_date" TIMESTAMP WITH TIME ZONE,
        "verified_by" UUID,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Check if test customer already exists
    console.log(`Checking if test customer (${TEST_EMAIL}) already exists...`);
    const [existingCustomer] = await sequelize.query(`
      SELECT id, email FROM "${schema}"."customers" WHERE email = '${TEST_EMAIL}'
    `);

    if (existingCustomer && existingCustomer.length > 0) {
      console.log('✅ Test customer already exists. Updating password...');
      
      // Hash the password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(TEST_PASSWORD, salt);
      
      // Update the password
      await sequelize.query(`
        UPDATE "${schema}"."customers" 
        SET password = '${hashedPassword}', updated_at = CURRENT_TIMESTAMP
        WHERE email = '${TEST_EMAIL}'
      `);
      
      console.log('✅ Test customer password updated successfully.');
    } else {
      console.log('Creating new test customer...');
      
      // Hash the password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(TEST_PASSWORD, salt);
      
      // Insert the test customer
      await sequelize.query(`
        INSERT INTO "${schema}"."customers" 
        (name, email, password, company_name, verification_status, is_identity_verified, is_address_verified) 
        VALUES 
        ('${TEST_NAME}', '${TEST_EMAIL}', '${hashedPassword}', '${TEST_COMPANY}', 'APPROVED', TRUE, TRUE)
      `);
      
      console.log('✅ Test customer created successfully.');
    }
    
    // Get the customer details
    const [customer] = await sequelize.query(`
      SELECT id, name, email, company_name, verification_status 
      FROM "${schema}"."customers" 
      WHERE email = '${TEST_EMAIL}'
    `);
    
    console.log('-'.repeat(50));
    console.log('TEST CUSTOMER DETAILS:');
    console.log(JSON.stringify(customer[0], null, 2));
    console.log('-'.repeat(50));
    console.log('✅ TEST CUSTOMER READY FOR USE');
    console.log('You can now use these credentials for testing:');
    console.log(`Email: ${TEST_EMAIL}`);
    console.log(`Password: ${TEST_PASSWORD}`);
    console.log('-'.repeat(50));
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the function
createTestCustomer(); 