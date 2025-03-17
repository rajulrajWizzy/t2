// populate-short-codes.js
require('dotenv').config();
const { Sequelize } = require('sequelize');

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

// Branch short codes mapping
const branchShortCodes = {
  'nagarabhavi': 'ngb',
  'outer ringroad': 'orr',
  'kengeri ring road': 'krr',
  'papareddypalya': 'prp'
  // Add more branches as needed
};

// Seating type short codes mapping
const seatingTypeShortCodes = {
  'HOT_DESK': 'hot',
  'DEDICATED_DESK': 'ded',
  'CUBICLE': 'cub',
  'MEETING_ROOM': 'meet',
  'DAILY_PASS': 'day',
};

async function populateShortCodes() {
  const transaction = await sequelize.transaction();

  try {
    // Populate short codes for branches
    console.log('Populating short codes for branches...');
    
    // Get all branches
    const branches = await sequelize.query(
      'SELECT id, name FROM branches WHERE short_code IS NULL',
      { transaction, type: Sequelize.QueryTypes.SELECT }
    );
    
    // Update each branch with its short code
    for (const branch of branches) {
      const shortCode = branchShortCodes[branch.name.toLowerCase()] || 
                        branch.name.substring(0, 3).toLowerCase();
      
      await sequelize.query(
        'UPDATE branches SET short_code = ? WHERE id = ?',
        {
          transaction,
          replacements: [shortCode, branch.id]
        }
      );
      
      console.log(`Updated branch "${branch.name}" with short code "${shortCode}"`);
    }
    
    // Fix the spelling of Naagarbhaavi to Nagarabhavi
    console.log('Fixing spelling of Naagarbhaavi to Nagarabhavi...');
    await sequelize.query(
      "UPDATE branches SET name = 'Nagarabhavi' WHERE name LIKE 'Naagarbhaavi%'",
      { transaction }
    );
    
    // Populate short codes for seating types
    console.log('Populating short codes for seating types...');
    
    // Update seating types with their short codes
    for (const [name, shortCode] of Object.entries(seatingTypeShortCodes)) {
      await sequelize.query(
        'UPDATE seating_types SET short_code = ? WHERE name = ? AND short_code IS NULL',
        {
          transaction,
          replacements: [shortCode, name]
        }
      );
      
      console.log(`Updated seating type "${name}" with short code "${shortCode}"`);
    }
    
    await transaction.commit();
    console.log('Short codes populated successfully');
  } catch (error) {
    await transaction.rollback();
    console.error('Failed to populate short codes:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Run the script
populateShortCodes()
  .then(() => {
    console.log('Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  }); 