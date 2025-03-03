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

async function seedBranches() {
  try {
    // Connect to database
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');
    
    // Clear existing branches
    await Branch.destroy({ where: {} });
    console.log('Cleared existing branches');
    
    // Create new branches
    for (const branch of branches) {
      await Branch.create(branch);
    }
    
    console.log('Branches seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding branches:', error);
    process.exit(1);
  }
}

// Run the seed function
seedBranches();