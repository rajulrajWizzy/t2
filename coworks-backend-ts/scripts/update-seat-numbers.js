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

// Seating type short code mapping
const seatingTypeShortCodes = {
  'HOT_DESK': 'HD',
  'DEDICATED_DESK': 'DD',
  'CUBICLE': 'CB',
  'CUBICLE_3': 'CB3',
  'CUBICLE_4': 'CB4',
  'CUBICLE_6': 'CB6',
  'CUBICLE_10': 'CB10',
  'MEETING_ROOM': 'MR',
  'DAILY_PASS': 'DP'
};

async function updateSeatNumbers() {
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
        WHERE name = 'update_seat_numbers'
      );
    `, { type: Sequelize.QueryTypes.SELECT });
    
    if (migrationExists[0].exists) {
      console.log('Migration for updating seat numbers has already been applied. Skipping...');
      process.exit(0);
      return;
    }

    // Get all seats with their seating types and branch codes
    const seats = await sequelize.query(`
      SELECT s.id, s.seat_number, s.branch_id, s.seating_type_id, 
             st.name as seating_type_name, st.short_code as seating_type_code,
             b.short_code as branch_code
      FROM "${dbSchema}"."seats" s
      JOIN "${dbSchema}"."seating_types" st ON s.seating_type_id = st.id
      JOIN "${dbSchema}"."branches" b ON s.branch_id = b.id
    `, { type: Sequelize.QueryTypes.SELECT });
    
    console.log(`Found ${seats.length} seats to update`);
    
    // Group seats by branch and seating type for sequential numbering
    const seatGroups = {};
    
    for (const seat of seats) {
      const key = `${seat.branch_id}_${seat.seating_type_id}`;
      if (!seatGroups[key]) {
        seatGroups[key] = [];
      }
      seatGroups[key].push(seat);
    }
    
    // Update seats with new numbering format
    for (const [groupKey, groupSeats] of Object.entries(seatGroups)) {
      // Sort seats to ensure consistent numbering
      groupSeats.sort((a, b) => {
        // Try to extract numeric part if it exists
        const aNumMatch = a.seat_number.match(/(\d+)$/);
        const bNumMatch = b.seat_number.match(/(\d+)$/);
        
        if (aNumMatch && bNumMatch) {
          return parseInt(aNumMatch[1]) - parseInt(bNumMatch[1]);
        }
        
        // Fall back to string comparison
        return a.seat_number.localeCompare(b.seat_number);
      });
      
      // Generate new seat numbers
      for (let i = 0; i < groupSeats.length; i++) {
        const seat = groupSeats[i];
        const seatingTypeCode = seat.seating_type_code || 
                              seatingTypeShortCodes[seat.seating_type_name] || 
                              'XX';
        
        // Pad number with zeros to create 3-digit number
        const seatNumberPadded = String(i + 1).padStart(3, '0');
        
        // New format: [SeatingTypeCode][Number] e.g., HD001
        const newSeatNumber = `${seatingTypeCode}${seatNumberPadded}`;
        
        // Update seat number in database
        await sequelize.query(`
          UPDATE "${dbSchema}"."seats"
          SET seat_number = '${newSeatNumber}'
          WHERE id = ${seat.id};
        `);
        
        console.log(`Updated seat ${seat.id} from ${seat.seat_number} to ${newSeatNumber}`);
      }
    }
    
    // Record the migration
    await sequelize.query(`
      INSERT INTO "${dbSchema}"."migrations" (name, applied_at)
      VALUES ('update_seat_numbers', NOW());
    `);
    console.log('Recorded migration for seat number updates');

    console.log('Migration completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error in migration:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

updateSeatNumbers(); 