const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config();

// Create Sequelize instance
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST || 'localhost',
    dialect: 'postgres',
    logging: console.log
  }
);

// Define SeatingType model directly for this script
const SeatingType = sequelize.define('SeatingType', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.ENUM('HOT_DESK', 'DEDICATED_DESK', 'CUBICLE', 'MEETING_ROOM', 'DAILY_PASS'),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  hourly_rate: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  is_hourly: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  min_booking_duration: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 2
  }
}, {
  tableName: 'seating_types',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

const seatingTypes = [
  {
    name: 'HOT_DESK',
    description: 'Flexible desk space available on a first-come, first-served basis',
    hourly_rate: 150.00,
    is_hourly: true,
    min_booking_duration: 2
  },
//   {
//     name: 'DEDICATED_DESK',
//     description: 'Permanently assigned desk for regular use',
//     hourly_rate: 200.00,
//     is_hourly: true,
//     min_booking_duration: 2
//   },
//   {
//     name: 'CUBICLE',
//     description: 'Semi-private workspace with partitions',
//     hourly_rate: 250.00,
//     is_hourly: true,
//     min_booking_duration: 2
//   },
//   {
//     name: 'MEETING_ROOM',
//     description: 'Private room for meetings and conferences',
//     hourly_rate: 500.00,
//     is_hourly: true,
//     min_booking_duration: 2
//   },
//   {
//     name: 'DAILY_PASS',
//     description: 'Full day access to hot desk spaces',
//     hourly_rate: 800.00,
//     is_hourly: false,
//     min_booking_duration: 8
//   }
];

async function seedSeatingTypes() {
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
      console.warn('Note about ENUM:', enumError.message);
    }
    
    // Clear existing seating types
    await SeatingType.destroy({ where: {} });
    console.log('Cleared existing seating types');
    
    // Create new seating types
    let count = 0;
    for (const type of seatingTypes) {
      await SeatingType.create(type);
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