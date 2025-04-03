/**
 * Script to fix authentication tables and issues
 * This script:
 * 1. Ensures the blacklisted_tokens table exists with correct structure
 * 2. Ensures the admins table has the default admin
 */

require('dotenv').config();
const { Sequelize } = require('sequelize');

async function main() {
  try {
    // Database connection parameters
    const DB_HOST = process.env.DB_HOST || 'localhost';
    const DB_PORT = process.env.DB_PORT || 5432;
    const DB_NAME = process.env.DB_NAME || 'excel_coworks';
    const DB_USER = process.env.DB_USER || 'postgres';
    const DB_PASSWORD = process.env.DB_PASSWORD || 'password';
    const DB_SCHEMA = process.env.DB_SCHEMA || 'excel_coworks_schema';
    
    console.log(`Connecting to database: ${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME}`);
    console.log(`Using schema: ${DB_SCHEMA}`);
    
    // Create Sequelize instance
    const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
      host: DB_HOST,
      port: DB_PORT,
      dialect: 'postgres',
      logging: false
    });
    
    // Test connection
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.\n');
    
    // 1. Ensure schema exists
    console.log(`Ensuring schema "${DB_SCHEMA}" exists...`);
    await sequelize.query(`CREATE SCHEMA IF NOT EXISTS "${DB_SCHEMA}"`);
    console.log(`✅ Schema "${DB_SCHEMA}" exists or was created.\n`);
    
    // 2. Fix blacklisted_tokens table
    console.log('Checking blacklisted_tokens table...');
    
    // Check if table exists
    const [tokenTables] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = '${DB_SCHEMA}' 
      AND table_name = 'blacklisted_tokens'
    `);
    
    if (tokenTables.length === 0) {
      console.log('⚠️ blacklisted_tokens table does not exist, creating it...');
      
      // Create the table
      await sequelize.query(`
        CREATE TABLE "${DB_SCHEMA}"."blacklisted_tokens" (
          id SERIAL PRIMARY KEY,
          token TEXT NOT NULL,
          expires_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          blacklisted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);
      
      // Create index for faster lookups
      await sequelize.query(`
        CREATE INDEX "idx_blacklisted_tokens_token" 
        ON "${DB_SCHEMA}"."blacklisted_tokens" ("token")
      `);
      
      console.log('✅ Created blacklisted_tokens table with index.\n');
    } else {
      console.log('✅ blacklisted_tokens table exists.\n');
      
      // Check table structure
      const [columns] = await sequelize.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = '${DB_SCHEMA}' 
        AND table_name = 'blacklisted_tokens'
      `);
      
      console.log('Current table columns:');
      columns.forEach(col => {
        console.log(`- ${col.column_name} (${col.data_type})`);
      });
      
      // Check for missing columns and add them if needed
      const requiredColumns = {
        'id': 'integer',
        'token': 'text',
        'expires_at': 'timestamp with time zone',
        'created_at': 'timestamp with time zone',
        'blacklisted_at': 'timestamp with time zone'
      };
      
      const existingColumns = columns.map(c => c.column_name);
      
      for (const [colName, colType] of Object.entries(requiredColumns)) {
        if (!existingColumns.includes(colName)) {
          console.log(`⚠️ Missing column: ${colName}, adding it...`);
          
          await sequelize.query(`
            ALTER TABLE "${DB_SCHEMA}"."blacklisted_tokens"
            ADD COLUMN "${colName}" ${colType} ${colName === 'created_at' || colName === 'blacklisted_at' ? 'DEFAULT NOW()' : ''}
          `);
          
          console.log(`✅ Added column ${colName}`);
        }
      }
      
      // Check for index
      const [indices] = await sequelize.query(`
        SELECT indexname 
        FROM pg_indexes 
        WHERE schemaname = '${DB_SCHEMA}' 
        AND tablename = 'blacklisted_tokens' 
        AND indexname = 'idx_blacklisted_tokens_token'
      `);
      
      if (indices.length === 0) {
        console.log('⚠️ Missing index on token column, creating it...');
        
        await sequelize.query(`
          CREATE INDEX "idx_blacklisted_tokens_token" 
          ON "${DB_SCHEMA}"."blacklisted_tokens" ("token")
        `);
        
        console.log('✅ Created index on token column');
      } else {
        console.log('✅ Index on token column exists');
      }
    }
    
    // 3. Fix admins table
    console.log('\nChecking admins table...');
    
    // Check if table exists
    const [adminTables] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = '${DB_SCHEMA}' 
      AND table_name = 'admins'
    `);
    
    if (adminTables.length === 0) {
      console.log('⚠️ admins table does not exist, creating it...');
      
      // Create the table
      await sequelize.query(`
        CREATE TABLE "${DB_SCHEMA}"."admins" (
          id SERIAL PRIMARY KEY,
          username VARCHAR(255) NOT NULL UNIQUE,
          email VARCHAR(255) NOT NULL UNIQUE,
          password VARCHAR(255) NOT NULL,
          name VARCHAR(255),
          role VARCHAR(50) NOT NULL DEFAULT 'branch_admin',
          branch_id INTEGER,
          is_active BOOLEAN DEFAULT TRUE,
          last_login TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);
      
      console.log('✅ Created admins table.\n');
    } else {
      console.log('✅ admins table exists.\n');
      
      // Check table structure
      const [columns] = await sequelize.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = '${DB_SCHEMA}' 
        AND table_name = 'admins'
      `);
      
      console.log('Current table columns:');
      columns.forEach(col => {
        console.log(`- ${col.column_name} (${col.data_type})`);
      });
    }
    
    // 4. Check if default admin exists, create if not
    console.log('\nChecking for default admin user...');
    
    const [adminUsers] = await sequelize.query(`
      SELECT id, username, email, role 
      FROM "${DB_SCHEMA}"."admins" 
      WHERE id = 1 OR username = 'admin' OR email = 'admin@example.com'
    `);
    
    if (adminUsers.length === 0) {
      console.log('⚠️ Default admin user not found, creating it...');
      
      // Generate hashed password (using bcrypt would be better, but keeping it simple for this script)
      const crypto = require('crypto');
      const defaultPassword = 'admin123'; // You should change this after first login
      const hashedPassword = crypto.createHash('sha256').update(defaultPassword).digest('hex');
      
      // Insert default admin
      await sequelize.query(`
        INSERT INTO "${DB_SCHEMA}"."admins" 
        (username, email, password, name, role, is_active) 
        VALUES 
        ('admin', 'admin@example.com', :password, 'Default Admin', 'super_admin', TRUE)
      `, {
        replacements: { password: hashedPassword }
      });
      
      console.log('✅ Created default admin user:');
      console.log('   Username: admin');
      console.log('   Email: admin@example.com');
      console.log('   Password: admin123 (please change after first login)');
      console.log('   Role: super_admin\n');
    } else {
      console.log('✅ Admin user exists:');
      console.log(adminUsers[0]);
    }
    
    // Close connection
    await sequelize.close();
    console.log('\n✅ Database connection closed.');
    
    console.log('\n✅ Authentication tables fixed successfully!');
    console.log('You should now be able to authenticate with both user and admin tokens.');
  } catch (error) {
    console.error('❌ Error fixing authentication tables:', error);
    process.exit(1);
  }
}

main();
