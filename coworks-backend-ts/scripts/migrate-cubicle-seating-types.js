require('dotenv').config();
const { Sequelize, DataTypes, Op } = require('sequelize');

const SCHEMA = process.env.DB_SCHEMA || 'public';

// Database connection configuration
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    logging: false
  }
);

// Define the migration name
const MIGRATION_NAME = 'split-cubicle-seating-types';

// Cubicle seating type configurations
const CUBICLE_TYPES = [
  {
    name: 'CUBICLE_3',
    short_code: 'CUB3',
    description: '3-Seater Cubicle for small teams',
    hourly_rate: 25,
    is_hourly: false,
    min_booking_duration: 1, // 1 month
    min_seats: 3,
    capacity: 3
  },
  {
    name: 'CUBICLE_4',
    short_code: 'CUB4',
    description: '4-Seater Cubicle for small teams',
    hourly_rate: 30,
    is_hourly: false,
    min_booking_duration: 1, // 1 month
    min_seats: 4,
    capacity: 4
  },
  {
    name: 'CUBICLE_6',
    short_code: 'CUB6',
    description: '6-Seater Cubicle for medium teams',
    hourly_rate: 40,
    is_hourly: false,
    min_booking_duration: 1, // 1 month
    min_seats: 6,
    capacity: 6
  },
  {
    name: 'CUBICLE_10',
    short_code: 'CB10',
    description: '10-Seater Cubicle for larger teams',
    hourly_rate: 60,
    is_hourly: false,
    min_booking_duration: 1, // 1 month
    min_seats: 10,
    capacity: 10
  }
];

async function run() {
  try {
    // Connect to the database
    await sequelize.authenticate();
    console.log('Connected to database');

    // Set search path to the specified schema
    await sequelize.query(`SET search_path TO ${SCHEMA}`);

    // Check if migration has already been applied
    const [migrations] = await sequelize.query(
      `SELECT * FROM migrations WHERE name = :name`,
      {
        replacements: { name: MIGRATION_NAME },
        type: Sequelize.QueryTypes.SELECT
      }
    );

    if (migrations && migrations.length > 0) {
      console.log(`Migration ${MIGRATION_NAME} has already been applied.`);
      await sequelize.close();
      return;
    }

    // Get the original CUBICLE seating type
    const [originalCubicle] = await sequelize.query(
      `SELECT * FROM ${SCHEMA}.seating_types WHERE name = 'CUBICLE'`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (!originalCubicle) {
      console.log('Original CUBICLE seating type not found. Creating new cubicle types.');
    } else {
      console.log('Found original CUBICLE seating type:', originalCubicle);
    }

    // Create new cubicle seating types
    for (const cubicleType of CUBICLE_TYPES) {
      // Check if this cubicle type already exists
      const [existingType] = await sequelize.query(
        `SELECT * FROM ${SCHEMA}.seating_types WHERE name = :name`,
        {
          replacements: { name: cubicleType.name },
          type: Sequelize.QueryTypes.SELECT
        }
      );

      if (existingType) {
        console.log(`Seating type ${cubicleType.name} already exists, skipping.`);
        continue;
      }

      // Use original cubicle properties if available
      const hourlyRate = originalCubicle ? originalCubicle.hourly_rate : cubicleType.hourly_rate;
      
      // Create the new cubicle seating type
      await sequelize.query(
        `INSERT INTO ${SCHEMA}.seating_types 
        (name, short_code, description, hourly_rate, is_hourly, min_booking_duration, min_seats, capacity, created_at, updated_at) 
        VALUES (:name, :shortCode, :description, :hourlyRate, :isHourly, :minBookingDuration, :minSeats, :capacity, NOW(), NOW())`,
        {
          replacements: {
            name: cubicleType.name,
            shortCode: cubicleType.short_code,
            description: cubicleType.description,
            hourlyRate: hourlyRate * (cubicleType.capacity / 3), // Scale price based on capacity
            isHourly: cubicleType.is_hourly,
            minBookingDuration: cubicleType.min_booking_duration,
            minSeats: cubicleType.min_seats,
            capacity: cubicleType.capacity
          }
        }
      );

      console.log(`Created new seating type: ${cubicleType.name}`);
    }

    // If there are existing cubicle seats, reassign them to the appropriate new cubicle types
    if (originalCubicle) {
      console.log('Checking for existing cubicle seats to reassign...');
      
      // Get seats with the original cubicle seating type
      const [cubicleSeats] = await sequelize.query(
        `SELECT * FROM ${SCHEMA}.seats WHERE seating_type_id = :seatingTypeId`,
        {
          replacements: { seatingTypeId: originalCubicle.id },
          type: Sequelize.QueryTypes.SELECT
        }
      );

      console.log(`Found ${cubicleSeats.length} cubicle seats to reassign.`);

      // Get the IDs of the new cubicle seating types
      const [newCubicleTypes] = await sequelize.query(
        `SELECT id, name, capacity FROM ${SCHEMA}.seating_types 
         WHERE name IN ('CUBICLE_3', 'CUBICLE_4', 'CUBICLE_6', 'CUBICLE_10')`,
        { type: Sequelize.QueryTypes.SELECT }
      );

      // Group cubicle types by capacity for easy lookup
      const cubicleTypesByCapacity = {};
      for (const type of newCubicleTypes) {
        cubicleTypesByCapacity[type.capacity] = type.id;
      }

      // Track processed seats for reporting
      const processed = {
        total: cubicleSeats.length,
        reassigned: 0,
        skipped: 0
      };

      // Reassign seats based on capacity (if available in description or just evenly distribute)
      for (const seat of cubicleSeats) {
        // Try to determine capacity from seat description or seat number
        let capacity = 3; // Default to smallest cubicle
        
        // Check if seat description or number contains capacity information
        if (seat.description && seat.description.includes('seater')) {
          const match = seat.description.match(/(\d+)-seater/i);
          if (match && match[1]) {
            const seatCapacity = parseInt(match[1], 10);
            // Map to closest available cubicle size
            if (seatCapacity <= 3) capacity = 3;
            else if (seatCapacity <= 4) capacity = 4;
            else if (seatCapacity <= 6) capacity = 6;
            else capacity = 10;
          }
        } else if (seat.seat_number) {
          // Try to extract capacity from seat number if it contains digits
          const match = seat.seat_number.match(/C(\d+)/);
          if (match && match[1]) {
            const seatNumber = parseInt(match[1], 10);
            if (seatNumber % 10 === 3) capacity = 3;
            else if (seatNumber % 10 === 4) capacity = 4;
            else if (seatNumber % 10 === 6) capacity = 6;
            else if (seatNumber % 10 === 0) capacity = 10;
          }
        }
        
        // Get the appropriate cubicle type ID based on capacity
        const newSeatingTypeId = cubicleTypesByCapacity[capacity];
        
        if (newSeatingTypeId) {
          // Update the seat with the new seating type ID
          await sequelize.query(
            `UPDATE ${SCHEMA}.seats 
             SET seating_type_id = :newSeatingTypeId,
                 updated_at = NOW()
             WHERE id = :seatId`,
            {
              replacements: {
                seatId: seat.id,
                newSeatingTypeId
              }
            }
          );
          
          processed.reassigned++;
          console.log(`Reassigned seat ${seat.seat_number || seat.id} to ${capacity}-seater cubicle.`);
        } else {
          processed.skipped++;
          console.log(`Skipped seat ${seat.seat_number || seat.id} - could not determine appropriate cubicle type.`);
        }
      }

      console.log(`Seat reassignment summary: Total: ${processed.total}, Reassigned: ${processed.reassigned}, Skipped: ${processed.skipped}`);
    }

    // Record the migration
    await sequelize.query(
      `INSERT INTO ${SCHEMA}.migrations (name, applied_at) VALUES (:name, NOW())`,
      { replacements: { name: MIGRATION_NAME } }
    );

    console.log(`Migration ${MIGRATION_NAME} has been successfully applied.`);
    await sequelize.close();

  } catch (error) {
    console.error('Error applying migration:', error);
    await sequelize.close();
    process.exit(1);
  }
}

run(); 