import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import BranchModel from '@/models/branch';

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

const branches = [
  {
    name: 'Outer Ringroad',
    address: 'Excel Coworks, #552, 3rd floor, Service Road Nagarabhavi, Bengaluru-560072',
    location: 'Outer Ringroad',
    latitude: 12.960887919914697,
    longitude: 77.50951199690735,
    cost_multiplier: 1.00,
    opening_time: '08:00:00',
    closing_time: '22:00:00',
    short_code: 'orr'
  },
  {
    name: 'Nagarabhavi',
    address: 'Excel Coworks, #2, 3rd & 4th floor, Above Mcdonald\'s, 80 feet Road, Nagarabhavi, Bengaluru-560072',
    location: 'Nagarabhavi',
    latitude: 12.960887919914697,
    longitude: 77.50951199690735,
    cost_multiplier: 1.10,
    opening_time: '08:00:00',
    closing_time: '22:00:00',
    short_code: 'ngb'
  },
  {
    name: 'Kengeri Ring Road',
    address: 'Excel Coworks, #103, 3rd floor, Above Godrej Interio, Kengeri Ring Road, Bengaluru-560056',
    location: 'Kengeri Ring Road',
    latitude: 12.962268042295037,
    longitude: 77.51229349884184,
    cost_multiplier: 0.95,
    opening_time: '08:00:00',
    closing_time: '22:00:00',
    short_code: 'krr'
  },
  {
    name: 'Papareddypalya',
    address: 'Excel Coworks, #962/171,172 & 173, 1st floor, Above SBI Bank, Old Ring Road, Papareddypalya, Bengaluru-560072',
    location: 'Papareddypalya',
    latitude: 12.970299552649015, 
    longitude: 77.5068244832054,
    cost_multiplier: 1.05,
    opening_time: '08:00:00',
    closing_time: '22:00:00',
    short_code: 'prp'
  }
];

async function seedBranches(): Promise<void> {
  try {
    // Connect to database
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');
    
    // Clear existing branches
    await BranchModel.destroy({ where: {} });
    console.log('Cleared existing branches');
    
    // Create new branches
    for (const branch of branches) {
      await BranchModel.create(branch);
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