const bcrypt = require('bcryptjs');
const { Sequelize } = require('sequelize');
const colors = require('colors');

// Load environment variables
require('dotenv').config();

const log = (message, color = 'white') => {
  console.log(colors[color](message));
};

async function fixPasswords() {
  log('Starting password fix script...', 'cyan');
  
  // Create Sequelize instance
  const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
      ssl: process.env.NODE_ENV === 'production' ? {
        require: true,
        rejectUnauthorized: false
      } : false
    }
  });
  
  try {
    // Test the connection
    await sequelize.authenticate();
    log('✅ Database connection established', 'green');
    
    // Get the schema name from the connection URL or default to public
    const schema = process.env.DATABASE_SCHEMA || 'public';
    
    // Find customers with password issues
    const [customers] = await sequelize.query(`
      SELECT id, email 
      FROM "${schema}"."customers" 
      WHERE password IS NULL 
      OR password = '' 
      OR length(password) < 10
      OR (
        substring(password from 1 for 4) != '$2a$'
        AND substring(password from 1 for 4) != '$2b$'
        AND substring(password from 1 for 4) != '$2y$'
      )
    `);
    
    if (customers.length === 0) {
      log('✅ No customers found with password issues', 'green');
      return;
    }
    
    log(`Found ${customers.length} customers with password issues`, 'yellow');
    
    // Fix each customer's password
    for (const customer of customers) {
      try {
        // Generate new password hash
        const salt = bcrypt.genSaltSync(10);
        const hashedPassword = bcrypt.hashSync('Customer@123', salt);
        
        // Update the customer's password
        await sequelize.query(`
          UPDATE "${schema}"."customers"
          SET password = $1,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
        `, {
          bind: [hashedPassword, customer.id]
        });
        
        log(`✅ Fixed password for customer ${customer.email}`, 'green');
      } catch (error) {
        log(`❌ Failed to fix password for customer ${customer.email}: ${error.message}`, 'red');
      }
    }
    
    log('✅ Password fix script completed', 'green');
  } catch (error) {
    log(`❌ Error: ${error.message}`, 'red');
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Run the script
fixPasswords().catch(error => {
  log(`❌ Fatal error: ${error.message}`, 'red');
  process.exit(1);
}); 