require('dotenv').config();
const { Sequelize } = require('sequelize');

const SCHEMA = process.env.DB_SCHEMA || 'public';

// Database connection configuration
if (process.env.DATABASE_URL) {
  // Use DATABASE_URL for connection
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

// Define the migration name
const MIGRATION_NAME = 'add-seat-codes';

async function run() {
  try {
    // Connect to database
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');

    // Set search path to ensure correct schema
    await sequelize.query(`SET search_path TO "${SCHEMA}";`);
    console.log(`Search path set to: ${SCHEMA}`);
    
    // Check if migration has already been applied
    const migrationExists = await sequelize.query(`
      SELECT EXISTS (
        SELECT 1 FROM "${SCHEMA}"."migrations" 
        WHERE name = :name
      );
    `, { 
      replacements: { name: MIGRATION_NAME },
      type: Sequelize.QueryTypes.SELECT 
    });
    
    if (migrationExists[0].exists) {
      console.log('Migration for seat codes has already been applied. Skipping...');
      process.exit(0);
      return;
    }

    // Add seat_code column if it doesn't exist
    await sequelize.query(`
      ALTER TABLE "${SCHEMA}"."seats"
      ADD COLUMN IF NOT EXISTS seat_code VARCHAR(10);
    `);
    console.log('Added seat_code column to seats table');

    // Get all seats without codes
    const seats = await sequelize.query(`
      SELECT s.id, s.branch_id, b.short_code as branch_code, st.short_code as seating_type_code
      FROM "${SCHEMA}"."seats" s
      JOIN "${SCHEMA}"."branches" b ON s.branch_id = b.id
      JOIN "${SCHEMA}"."seating_types" st ON s.seating_type_id = st.id
      WHERE s.seat_code IS NULL;
    `, { type: Sequelize.QueryTypes.SELECT });

    console.log(`Found ${seats.length} seats to update`);

    // Update each seat with a unique code
    for (const seat of seats) {
      const seatNumber = await sequelize.query(`
        SELECT COUNT(*) + 1 as num
        FROM "${SCHEMA}"."seats"
        WHERE branch_id = :branchId AND seating_type_id = (
          SELECT id FROM "${SCHEMA}"."seating_types" WHERE short_code = :seatingTypeCode
        );
      `, {
        replacements: { 
          branchId: seat.branch_id,
          seatingTypeCode: seat.seating_type_code
        },
        type: Sequelize.QueryTypes.SELECT
      });

      // Format: BRN-TYP-NNN (where BRN is 3 chars, TYP is 3 chars, NNN is 3 digits)
      const branchPrefix = (seat.branch_code || 'BRN').substring(0, 3).toUpperCase();
      const typePrefix = (seat.seating_type_code || 'TYP').substring(0, 3).toUpperCase();
      const seatNum = String(seatNumber[0].num).padStart(3, '0');
      const seatCode = `${branchPrefix}${typePrefix}${seatNum}`;
      
      await sequelize.query(
        `UPDATE "${SCHEMA}"."seats"
        SET seat_code = :seatCode
        WHERE id = :seatId;`,
        {
          replacements: { 
            seatId: seat.id,
            seatCode
          }
        }
      );

      console.log(`Updated seat ${seat.id} with code: ${seatCode}`);
    }

    // Record the migration
    await sequelize.query(
      `INSERT INTO "${SCHEMA}"."migrations" (name, applied_at)
      VALUES (:name, NOW());`,
      { replacements: { name: MIGRATION_NAME } }
    );

    console.log('Migration completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error in migration:', error);
    process.exit(1);
  }
}

run();