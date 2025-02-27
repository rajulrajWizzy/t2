// utils/seed-branches.js
import { Sequelize } from 'sequelize';
import Branch from '../models/branch.js';

// Replace with your actual database configuration
const sequelize = new Sequelize(
  process.env.DB_NAME ,
  process.env.DB_USER ,
  process.env.DB_PASS , // Replace with your actual password
  {
    host: 'localhost',
    dialect: 'postgres',
    logging: console.log
  }
);

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