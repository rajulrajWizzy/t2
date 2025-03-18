const { Sequelize, DataTypes } = require('sequelize');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const dbSchema = process.env.DB_SCHEMA || 'excel_coworks_schema';

// Create Sequelize instance
const sequelize = new Sequelize(process.env.DATABASE_URL || {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  dialect: 'postgres',
  logging: false
});

// Define Branch model
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
  },
  images: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  amenities: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  short_code: {
    type: DataTypes.STRING(10),
    allowNull: true,
    unique: true
  }
}, {
  tableName: 'branches',
  schema: dbSchema,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// Branch data with amenities and images
const branchUpdates = [
  {
    id: 1,
    short_code: 'orr',
    amenities: {
      wifi: true,
      parking: true,
      cafeteria: true,
      meeting_rooms: true,
      printer: true,
      air_conditioning: true,
      security: true,
      reception: true,
      power_backup: true,
      coffee_machine: true
    },
    images: {
      main: '/images/branches/orr/main.jpg',
      interior: '/images/branches/orr/interior.jpg',
      meeting_rooms: '/images/branches/orr/meeting-rooms.jpg',
      cafeteria: '/images/branches/orr/cafeteria.jpg'
    }
  },
  {
    id: 2,
    short_code: 'kor',
    amenities: {
      wifi: true,
      parking: true,
      cafeteria: true,
      meeting_rooms: true,
      printer: true,
      air_conditioning: true,
      security: true,
      reception: true,
      power_backup: true,
      coffee_machine: true
    },
    images: {
      main: '/images/branches/kor/main.jpg',
      interior: '/images/branches/kor/interior.jpg',
      meeting_rooms: '/images/branches/kor/meeting-rooms.jpg',
      cafeteria: '/images/branches/kor/cafeteria.jpg'
    }
  },
  {
    id: 3,
    short_code: 'mar',
    amenities: {
      wifi: true,
      parking: true,
      cafeteria: true,
      meeting_rooms: true,
      printer: true,
      air_conditioning: true,
      security: true,
      reception: true,
      power_backup: true,
      coffee_machine: true
    },
    images: {
      main: '/images/branches/mar/main.jpg',
      interior: '/images/branches/mar/interior.jpg',
      meeting_rooms: '/images/branches/mar/meeting-rooms.jpg',
      cafeteria: '/images/branches/mar/cafeteria.jpg'
    }
  }
];

async function updateBranches() {
  try {
    // Connect to database
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');
    
    // Set search path to ensure correct schema
    await sequelize.query(`SET search_path TO "${dbSchema}";`);
    console.log(`Search path set to: ${dbSchema}`);
    
    // Update each branch
    for (const update of branchUpdates) {
      const branch = await Branch.findByPk(update.id);
      if (branch) {
        await branch.update({
          short_code: update.short_code,
          amenities: update.amenities,
          images: update.images
        });
        console.log(`Updated branch ${update.id} with short code ${update.short_code}`);
      } else {
        console.log(`Branch ${update.id} not found`);
      }
    }
    
    console.log('Branches updated successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error updating branches:', error);
    process.exit(1);
  }
}

// Run the update
updateBranches(); 