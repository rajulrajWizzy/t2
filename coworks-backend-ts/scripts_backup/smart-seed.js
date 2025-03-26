// scripts/smart-seed.js
const { Sequelize, DataTypes } = require('sequelize');
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

// Function to check if a table exists
async function tableExists(tableName) {
  try {
    const query = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = '${dbSchema}'
        AND table_name = '${tableName}'
      );
    `;
    const result = await sequelize.query(query, { type: Sequelize.QueryTypes.SELECT });
    return result[0].exists;
  } catch (error) {
    console.error(`Error checking if table ${tableName} exists:`, error);
    return false;
  }
}

// Function to check if data already exists in a table
async function hasData(tableName) {
  try {
    const result = await sequelize.query(
      `SELECT COUNT(*) FROM "${dbSchema}"."${tableName}";`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    return parseInt(result[0].count, 10) > 0;
  } catch (error) {
    console.error(`Error checking if ${tableName} has data:`, error);
    return false;
  }
}

// Function to check if seed has already been applied
async function checkSeedStatus(seedName) {
  try {
    // Create seed tracking table if it doesn't exist
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "${dbSchema}"."seeds" (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Check if this specific seed has been applied
    const result = await sequelize.query(
      `SELECT EXISTS (SELECT 1 FROM "${dbSchema}"."seeds" WHERE name = '${seedName}');`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    
    return result[0].exists;
  } catch (error) {
    console.error(`Error checking seed status for ${seedName}:`, error);
    return false;
  }
}

// Function to record a seed
async function recordSeed(seedName) {
  try {
    await sequelize.query(
      `INSERT INTO "${dbSchema}"."seeds" (name) VALUES ('${seedName}') ON CONFLICT (name) DO NOTHING;`
    );
    console.log(`Recorded seed: ${seedName}`);
  } catch (error) {
    console.error(`Error recording seed ${seedName}:`, error);
  }
}

// Define Branch model directly for this script
const Branch = sequelize.define('Branch', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  location: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  latitude: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: true
  },
  longitude: {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: true
  },
  cost_multiplier: {
    type: DataTypes.DECIMAL(3, 2),
    allowNull: false,
    defaultValue: 1.00
  },
  opening_time: {
    type: DataTypes.TIME,
    allowNull: false,
    defaultValue: '08:00:00'
  },
  closing_time: {
    type: DataTypes.TIME,
    allowNull: false,
    defaultValue: '22:00:00'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  tableName: 'branches',
  schema: dbSchema,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

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
  schema: dbSchema,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

const branches = [
  {
    name: 'Outer Ringroad',
    address: 'Excel Coworks, #552, 3rd floor, Service Road Nagarabhavi, Bengaluru-560072',
    location: 'Outer Ringroad',
    latitude: 12.960887919914697,
    longitude: 77.50951199690735,
    cost_multiplier: 1.00,
    opening_time: '08:00:00',
    closing_time: '22:00:00'
  },
  {
    name: 'Nagarabhavi',
    address: 'Excel Coworks, #2, 3rd & 4th floor, Above Mcdonald\'s, 80 feet Road, Nagarabhavi, Bengaluru-560072',
    location: 'Nagarabhavi',
    latitude: 12.960887919914697,
    longitude: 77.50951199690735,
    cost_multiplier: 1.10,
    opening_time: '08:00:00',
    closing_time: '22:00:00'
  },
  {
    name: 'Kengeri Ring Road',
    address: 'Excel Coworks, #103, 3rd floor, Above Godrej Interio, Kengeri Ring Road, Bengaluru-560056',
    location: 'Kengeri Ring Road',
    latitude: 12.962268042295037,
    longitude: 77.51229349884184,
    cost_multiplier: 0.95,
    opening_time: '08:00:00',
    closing_time: '22:00:00'
  },
  {
    name: 'Papareddypalya',
    address: 'Excel Coworks, #962/171,172 & 173, 1st floor, Above SBI Bank, Old Ring Road, Papareddypalya, Bengaluru-560072',
    location: 'Papareddypalya',
    latitude: 12.970299552649015, 
    longitude: 77.5068244832054,
    cost_multiplier: 1.05,
    opening_time: '08:00:00',
    closing_time: '22:00:00'
  }
];

const seatingTypes = [
  {
    name: 'HOT_DESK',
    description: 'Flexible desk space available on a first-come, first-served basis',
    hourly_rate: 150.00,
    is_hourly: true,
    min_booking_duration: 2
  },
  {
    name: 'DEDICATED_DESK',
    description: 'Permanently assigned desk for regular use',
    hourly_rate: 200.00,
    is_hourly: true,
    min_booking_duration: 2
  },
  {
    name: 'CUBICLE',
    description: 'Semi-private workspace with partitions',
    hourly_rate: 250.00,
    is_hourly: true,
    min_booking_duration: 2
  },
  {
    name: 'MEETING_ROOM',
    description: 'Private room for meetings and conferences',
    hourly_rate: 500.00,
    is_hourly: true,
    min_booking_duration: 2
  },
  {
    name: 'DAILY_PASS',
    description: 'Full day access to hot desk spaces',
    hourly_rate: 800.00,
    is_hourly: false,
    min_booking_duration: 8
  }
];

async function seedBranches() {
  const seedName = 'branches_seed';
  
  try {
    // Check if this seed has already been applied
    const alreadySeeded = await checkSeedStatus(seedName);
    if (alreadySeeded) {
      console.log('Branches have already been seeded. Skipping...');
      return;
    }
    
    // Check if the branches table exists
    const branchesTableExists = await tableExists('branches');
    if (!branchesTableExists) {
      console.log('Branches table does not exist. Skipping seeding...');
      return;
    }
    
    // Check if branches already have data
    const branchesHaveData = await hasData('branches');
    if (branchesHaveData) {
      console.log('Branches already have data. Skipping...');
      // Still record the seed to prevent future attempts
      await recordSeed(seedName);
      return;
    }
    
    console.log('Seeding branches...');
    
    // Set search path to ensure correct schema
    await sequelize.query(`SET search_path TO "${dbSchema}";`);
    
    // Create new branches
    for (const branch of branches) {
      await Branch.create(branch);
      console.log(`Created branch: ${branch.name}`);
    }
    
    // Record the seed
    await recordSeed(seedName);
    console.log('Branches seeded successfully!');
  } catch (error) {
    console.error('Error seeding branches:', error);
  }
}

async function seedSeatingTypes() {
  const seedName = 'seating_types_seed';
  
  try {
    // Check if this seed has already been applied
    const alreadySeeded = await checkSeedStatus(seedName);
    if (alreadySeeded) {
      console.log('Seating types have already been seeded. Skipping...');
      return;
    }
    
    // Check if the seating_types table exists
    const seatingTypesTableExists = await tableExists('seating_types');
    if (!seatingTypesTableExists) {
      console.log('Seating types table does not exist. Skipping seeding...');
      return;
    }
    
    // Check if seating types already have data
    const seatingTypesHaveData = await hasData('seating_types');
    if (seatingTypesHaveData) {
      console.log('Seating types already have data. Skipping...');
      // Still record the seed to prevent future attempts
      await recordSeed(seedName);
      return;
    }
    
    console.log('Seeding seating types...');
    
    // Set search path to ensure correct schema
    await sequelize.query(`SET search_path TO "${dbSchema}";`);
    
    // Create ENUM type if it doesn't exist
    try {
      await sequelize.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_seating_types_name') THEN
            CREATE TYPE "${dbSchema}".seating_type_enum AS ENUM (
              'HOT_DESK', 'DEDICATED_DESK', 'CUBICLE', 'MEETING_ROOM', 'DAILY_PASS'
            );
          END IF;
        END
        $$;
      `);
    } catch (enumError) {
      console.warn('Note about ENUM:', enumError.message);
    }
    
    // Create new seating types
    let count = 0;
    for (const type of seatingTypes) {
      await SeatingType.create(type);
      count++;
      console.log(`Created seating type: ${type.name}`);
    }
    
    // Record the seed
    await recordSeed(seedName);
    console.log(`Seating types seeded successfully! Created ${count} types.`);
  } catch (error) {
    console.error('Error seeding seating types:', error);
  }
}

// Run all seeders
async function runSeeders() {
  try {
    // Connect to database
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    
    // Run seeds
    await seedBranches();
    await seedSeatingTypes();
    
    console.log('All seeds completed!');
    process.exit(0);
  } catch (error) {
    console.error('Error during seeding:', error);
    process.exit(1);
  }
}

// Run the seeders
runSeeders();