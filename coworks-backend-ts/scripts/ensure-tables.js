const colors = require('colors');
const { Sequelize } = require('sequelize');
require('dotenv').config();

const log = (message, color = 'white') => {
  console.log(colors[color](message));
};

async function ensureTables() {
  log('Ensuring database tables exist...', 'cyan');
  
  // Create Sequelize instance
  const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    ssl: process.env.NODE_ENV === 'production' ? {
      require: true,
      rejectUnauthorized: false
    } : false,
    logging: false
  });
  
  try {
    // Test connection
    await sequelize.authenticate();
    log('✅ Database connection established', 'green');
    
    // Create tables if they don't exist
    const tables = [
      'customers',
      'admins',
      'branches',
      'seats',
      'slots',
      'bookings',
      'support_tickets',
      'ticket_messages',
      'password_resets'
    ];
    
    for (const table of tables) {
      try {
        // Check if table exists
        const [results] = await sequelize.query(
          `SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = '${table}'
          );`
        );
        
        if (!results[0].exists) {
          log(`Creating table: ${table}`, 'yellow');
          await sequelize.query(`
            CREATE TABLE IF NOT EXISTS public.${table} (
              id SERIAL PRIMARY KEY,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
          `);
          log(`✅ Created table: ${table}`, 'green');
        } else {
          log(`✅ Table exists: ${table}`, 'green');
        }
      } catch (error) {
        log(`❌ Error creating table ${table}: ${error.message}`, 'red');
      }
    }
    
    log('\n✅ Database tables check completed', 'green');
    
  } catch (error) {
    log(`❌ Database error: ${error.message}`, 'red');
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Run the script
ensureTables().catch(error => {
  log(`❌ Fatal error: ${error.message}`, 'red');
  process.exit(1);
}); 