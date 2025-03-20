const { Sequelize } = require('sequelize');
require('dotenv').config();

const dbSchema = process.env.DB_SCHEMA || 'public';

// Create Sequelize instance
let sequelize;

// Check if DATABASE_URL exists (Vercel/Production)
if (process.env.DATABASE_URL) {
  console.log('Using DATABASE_URL for connection');
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: console.log,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    }
  });
} else {
  // Fallback to individual credentials (local development)
  console.log('Using individual credentials for connection');
  sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASS,
    {
      host: process.env.DB_HOST || 'localhost',
      dialect: 'postgres',
      logging: console.log,
      dialectOptions: {
        ssl: process.env.DB_SSL === 'true' ? {
          require: true,
          rejectUnauthorized: false
        } : undefined
      }
    }
  );
}

async function createSupportTicketTable() {
  try {
    // Connect to database
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');

    // Set search path to ensure correct schema
    await sequelize.query(`SET search_path TO "${dbSchema}";`);
    console.log(`Search path set to: ${dbSchema}`);
    
    // Check if migration has already been applied
    const migrationExists = await sequelize.query(`
      SELECT EXISTS (
        SELECT 1 FROM "${dbSchema}"."migrations" 
        WHERE name = 'create_support_tickets'
      );
    `, { type: Sequelize.QueryTypes.SELECT });
    
    if (migrationExists[0].exists) {
      console.log('Migration for support tickets has already been applied. Skipping...');
      process.exit(0);
      return;
    }

    // Check if table already exists
    const tableExists = await sequelize.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = '${dbSchema}'
        AND table_name = 'support_tickets'
      );
    `, { type: Sequelize.QueryTypes.SELECT });

    if (tableExists[0].exists) {
      console.log('Support tickets table already exists');
    } else {
      // Create support_tickets table
      await sequelize.query(`
        CREATE TABLE "${dbSchema}"."support_tickets" (
          id SERIAL PRIMARY KEY,
          ticket_number VARCHAR(20) NOT NULL UNIQUE,
          customer_id INTEGER NOT NULL REFERENCES "${dbSchema}"."customers"(id) ON DELETE CASCADE,
          branch_id INTEGER REFERENCES "${dbSchema}"."branches"(id),
          branch_code VARCHAR(10),
          booking_id INTEGER REFERENCES "${dbSchema}"."seat_bookings"(id),
          seating_type_id INTEGER REFERENCES "${dbSchema}"."seating_types"(id),
          category VARCHAR(100) NOT NULL,
          title VARCHAR(255) NOT NULL,
          description TEXT NOT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'ASSIGNED',
          priority VARCHAR(20) DEFAULT 'MEDIUM',
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
          closed_at TIMESTAMP,
          reopened_at TIMESTAMP
        );
      `);
      console.log('Created support_tickets table');
      
      // Create index on ticket_number
      await sequelize.query(`
        CREATE INDEX support_tickets_ticket_number_idx ON "${dbSchema}"."support_tickets" (ticket_number);
      `);
      
      // Create index on customer_id
      await sequelize.query(`
        CREATE INDEX support_tickets_customer_id_idx ON "${dbSchema}"."support_tickets" (customer_id);
      `);
      
      // Create index on branch_id
      await sequelize.query(`
        CREATE INDEX support_tickets_branch_id_idx ON "${dbSchema}"."support_tickets" (branch_id);
      `);
      
      // Create index on branch_code
      await sequelize.query(`
        CREATE INDEX support_tickets_branch_code_idx ON "${dbSchema}"."support_tickets" (branch_code);
      `);
      
      // Create index on status
      await sequelize.query(`
        CREATE INDEX support_tickets_status_idx ON "${dbSchema}"."support_tickets" (status);
      `);
    }
    
    // Check if support_ticket_messages table already exists
    const messagesTableExists = await sequelize.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = '${dbSchema}'
        AND table_name = 'support_ticket_messages'
      );
    `, { type: Sequelize.QueryTypes.SELECT });

    if (messagesTableExists[0].exists) {
      console.log('Support ticket messages table already exists');
    } else {
      // Create support_ticket_messages table
      await sequelize.query(`
        CREATE TABLE "${dbSchema}"."support_ticket_messages" (
          id SERIAL PRIMARY KEY,
          ticket_id INTEGER NOT NULL REFERENCES "${dbSchema}"."support_tickets"(id) ON DELETE CASCADE,
          sender_type VARCHAR(20) NOT NULL, -- 'CUSTOMER', 'ADMIN', 'SYSTEM'
          sender_id INTEGER,
          message TEXT NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `);
      console.log('Created support_ticket_messages table');
      
      // Create index on ticket_id
      await sequelize.query(`
        CREATE INDEX support_ticket_messages_ticket_id_idx ON "${dbSchema}"."support_ticket_messages" (ticket_id);
      `);
    }

    // Record the migration
    await sequelize.query(`
      INSERT INTO "${dbSchema}"."migrations" (name, applied_at)
      VALUES ('create_support_tickets', NOW());
    `);
    console.log('Recorded migration for support tickets');

    console.log('Migration completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error in migration:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

createSupportTicketTable(); 