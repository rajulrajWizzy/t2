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
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      }
    }
  );
}

async function addSeatCode() {
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
        WHERE name = 'add_seat_code'
      );
    `, { type: Sequelize.QueryTypes.SELECT });
    
    if (migrationExists[0].exists) {
      console.log('Migration for adding seat_code has already been applied. Skipping...');
      process.exit(0);
      return;
    }

    // Check if seat_code column exists in seats table
    const columnExists = await sequelize.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = '${dbSchema}'
        AND table_name = 'seats'
        AND column_name = 'seat_code'
      );
    `, { type: Sequelize.QueryTypes.SELECT });

    if (columnExists[0].exists) {
      console.log('seat_code column already exists in seats table');
    } else {
      // Add the seat_code column
      await sequelize.query(`
        ALTER TABLE "${dbSchema}"."seats"
        ADD COLUMN seat_code VARCHAR(20);
      `);
      console.log('Added seat_code column to seats table');
      
      // Generate seat codes for existing seats
      // First, need to get seating types to access their short codes
      const seatingTypes = await sequelize.query(`
        SELECT id, name, short_code FROM "${dbSchema}"."seating_types";
      `, { type: Sequelize.QueryTypes.SELECT });
      
      const seatingTypeMap = {};
      for (const st of seatingTypes) {
        let shortCode = st.short_code;
        if (!shortCode) {
          // Generate a default short code
          switch (st.name) {
            case 'HOT_DESK':
              shortCode = 'HD';
              break;
            case 'DEDICATED_DESK':
              shortCode = 'DD';
              break;
            case 'CUBICLE':
              shortCode = 'CU';
              break;
            case 'MEETING_ROOM':
              shortCode = 'MR';
              break;
            case 'DAILY_PASS':
              shortCode = 'DP';
              break;
            default:
              shortCode = st.name.substring(0, 2).toUpperCase();
          }
          
          // Update the seating type with the generated short code
          await sequelize.query(`
            UPDATE "${dbSchema}"."seating_types"
            SET short_code = '${shortCode}'
            WHERE id = ${st.id} AND short_code IS NULL;
          `);
        }
        
        seatingTypeMap[st.id] = shortCode;
      }
      
      // Get all seats grouped by branch and seating type
      const seats = await sequelize.query(`
        SELECT id, branch_id, seating_type_id, seat_number
        FROM "${dbSchema}"."seats"
        ORDER BY branch_id, seating_type_id, id;
      `, { type: Sequelize.QueryTypes.SELECT });
      
      // Track seats by branch and seating type for sequence numbers
      const counters = {};
      
      for (const seat of seats) {
        const branchId = seat.branch_id;
        const seatingTypeId = seat.seating_type_id;
        const counterKey = `${branchId}_${seatingTypeId}`;
        
        // Initialize counter if not exists
        if (!counters[counterKey]) {
          counters[counterKey] = 0;
        }
        
        // Increment counter for this branch and seating type
        counters[counterKey]++;
        
        // Get short code for this seating type
        const typeShortCode = seatingTypeMap[seatingTypeId] || 'ST';
        
        // Create seat code: [seating type short code] + [3-digit sequence]
        const sequenceNumber = counters[counterKey].toString().padStart(3, '0');
        const seatCode = `${typeShortCode}${sequenceNumber}`;
        
        // Update seat with the generated seat code
        await sequelize.query(`
          UPDATE "${dbSchema}"."seats"
          SET seat_code = '${seatCode}'
          WHERE id = ${seat.id};
        `);
      }
      
      console.log(`Generated seat codes for ${seats.length} existing seats`);
      
      // Make the column required and unique now that all seats have a code
      await sequelize.query(`
        ALTER TABLE "${dbSchema}"."seats"
        ALTER COLUMN seat_code SET NOT NULL,
        ADD CONSTRAINT seats_seat_code_unique UNIQUE (seat_code);
      `);
      console.log('Made seat_code required and unique');
    }

    // Record the migration
    await sequelize.query(`
      INSERT INTO "${dbSchema}"."migrations" (name, applied_at)
      VALUES ('add_seat_code', NOW());
    `);
    console.log('Recorded migration for seat_code');

    console.log('Migration completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error in migration:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

addSeatCode(); 