import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import SeatingTypeModel from '@/models/seatingType';
import { SeatingTypeEnum } from '@/types/seating';

// Load environment variables
dotenv.config();

// Create Sequelize instance
const sequelize = new Sequelize(
  process.env.DB_NAME as string,
  process.env.DB_USER as string,
  process.env.DB_PASS as string,
  {
    host: process.env.DB_HOST || 'localhost',
    dialect: 'postgres',
    logging: console.log
  }
);

const seatingTypes = [
  {
    name: SeatingTypeEnum.HOT_DESK,
    description: 'Flexible desk space with minimum 2-month commitment',
    hourly_rate: 150.00,
    is_hourly: false, // Changed to false as it's now monthly
    min_booking_duration: 60, // 60 days (2 months)
    min_seats: 1,
    short_code: 'hot'
  },
  {
    name: SeatingTypeEnum.DEDICATED_DESK,
    description: 'Permanently assigned desk with minimum 3-month commitment and 10-seat minimum',
    hourly_rate: 200.00,
    is_hourly: false, // Changed to false as it's now monthly
    min_booking_duration: 90, // 90 days (3 months)
    min_seats: 10,
    short_code: 'ded'
  },
  {
    name: SeatingTypeEnum.CUBICLE,
    description: 'Semi-private workspace with minimum 3-month commitment',
    hourly_rate: 250.00,
    is_hourly: false, // Changed to false as it's now monthly
    min_booking_duration: 90, // 90 days (3 months)
    min_seats: 1,
    short_code: 'cub'
  },
  {
    name: SeatingTypeEnum.MEETING_ROOM,
    description: 'Private room for meetings and conferences',
    hourly_rate: 500.00,
    is_hourly: true, // Stays hourly
    min_booking_duration: 2, // Minimum 2 hours
    min_seats: 1,
    short_code: 'meet'
  },
  {
    name: SeatingTypeEnum.DAILY_PASS,
    description: 'Full day access to hot desk spaces based on availability',
    hourly_rate: 800.00,
    is_hourly: false,
    min_booking_duration: 1, // 1 day minimum
    min_seats: 1,
    short_code: 'day'
  }
];

async function seedSeatingTypes(): Promise<void> {
  try {
    // Connect to database
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');
    
    // Check if ENUM type exists and create it if needed
    try {
      await sequelize.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_seating_types_name') THEN
            CREATE TYPE "enum_seating_types_name" AS ENUM (
              'HOT_DESK', 'DEDICATED_DESK', 'CUBICLE', 'MEETING_ROOM', 'DAILY_PASS'
            );
          END IF;
        END
        $$;
      `);
    } catch (enumError) {
      console.warn('Note about ENUM:', (enumError as Error).message);
    }
    
    // Clear existing seating types
    await SeatingTypeModel.destroy({ where: {} });
    console.log('Cleared existing seating types');
    
    // Create new seating types
    let count = 0;
    for (const type of seatingTypes) {
      await SeatingTypeModel.create(type);
      count++;
    }
    
    console.log(`Seating types seeded successfully! Created ${count} types.`);
    process.exit(0);
  } catch (error) {
    console.error('Error seeding seating types:', error);
    process.exit(1);
  }
}

// Run the seed function
seedSeatingTypes();