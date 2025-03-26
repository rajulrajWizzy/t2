require('dotenv').config();
const { Sequelize, DataTypes, Op } = require('sequelize');

const SCHEMA = process.env.DB_SCHEMA || 'public';

// Database connection configuration
if (process.env.DATABASE_URL) {
  // Use DATABASE_URL for connection
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

// Define the migration name
const MIGRATION_NAME = 'enforce-three-letter-short-codes';

// Function to create a three-letter short code from a name
function generateShortCode(name, existingCodes = []) {
  // Remove non-alphanumeric characters and split into words
  const words = name.replace(/[^a-zA-Z0-9 ]/g, '').split(' ');
  
  let shortCode = '';
  
  if (words.length >= 3) {
    // Use first letter of first three words
    shortCode = (words[0][0] + words[1][0] + words[2][0]).toUpperCase();
  } else if (words.length === 2) {
    // Use first letter of first word and first two letters of second word
    shortCode = (words[0][0] + words[1].substring(0, 2)).toUpperCase();
  } else if (words.length === 1) {
    // Use first three letters of the word
    shortCode = words[0].substring(0, 3).toUpperCase();
  }
  
  // If short code is less than 3 characters, pad with 'X'
  while (shortCode.length < 3) {
    shortCode += 'X';
  }
  
  // If short code already exists, add number suffix until unique
  let uniqueCode = shortCode;
  let counter = 1;
  
  while (existingCodes.includes(uniqueCode)) {
    uniqueCode = shortCode + counter;
    counter++;
  }
  
  return uniqueCode;
}

async function run() {
  let connection = null;
  
  try {
    console.log('Establishing database connection...');
    connection = await sequelize.authenticate();
    console.log('Connected to database successfully');

    // Check if this migration has already been run
    const migrationExists = await sequelize.query(
      `SELECT * FROM migrations WHERE name = :name`,
      {
        replacements: { name: MIGRATION_NAME },
        type: Sequelize.QueryTypes.SELECT
      }
    );

    if (migrationExists && migrationExists.length > 0) {
      console.log('Migration already applied. Skipping...');
      await sequelize.close();
      return;
    }

    // Create migration record to prevent running this twice
    await sequelize.query(
      `INSERT INTO ${SCHEMA}.migrations (name, applied_at) VALUES (:name, NOW())`,
      { replacements: { name: MIGRATION_NAME } }
    );

    // Fix branch short codes
    // Check if short_code column exists in branches table
    const [branchColumns] = await sequelize.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = '${SCHEMA}' 
        AND table_name = 'branches'
        AND column_name = 'short_code'
      )`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (branchColumns.exists) {
      console.log('Processing branch short codes');
      
      // Get all branches
      const branches = await sequelize.query(
        `SELECT id, name, short_code FROM ${SCHEMA}.branches`,
        { type: Sequelize.QueryTypes.SELECT }
      );
      
      console.log(`Found ${branches.length} branches to process`);
      
      // Get all existing short codes
      const existingBranchCodes = branches
        .filter(b => b.short_code && b.short_code.length >= 3)
        .map(b => b.short_code);
      
      console.log(`Found ${existingBranchCodes.length} existing valid branch short codes`);
      
      // Update branches with missing or invalid short codes
      let updatedCount = 0;
      for (const branch of branches) {
        // Skip if already has a valid 3+ letter code
        if (branch.short_code && branch.short_code.length >= 3) {
          continue;
        }
        
        const newShortCode = generateShortCode(branch.name, existingBranchCodes);
        existingBranchCodes.push(newShortCode);
        
        await sequelize.query(
          `UPDATE ${SCHEMA}.branches
           SET short_code = :shortCode
           WHERE id = :branchId`,
          {
            replacements: { 
              branchId: branch.id,
              shortCode: newShortCode
            }
          }
        );
        
        console.log(`Updated branch "${branch.name}" (ID: ${branch.id}): short_code set to "${newShortCode}"`);
        updatedCount++;
      }
      
      console.log(`Updated ${updatedCount} branches with new short codes`);
    } else {
      console.log('short_code column does not exist in branches table, skipping branch short codes');
    }

    // Fix seating type short codes
    // Check if short_code column exists in seating_types table
    const [seatingTypeColumns] = await sequelize.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = '${SCHEMA}' 
        AND table_name = 'seating_types'
        AND column_name = 'short_code'
      )`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (seatingTypeColumns.exists) {
      console.log('Processing seating type short codes');
      
      // Get all seating types
      const [seatingTypes] = await sequelize.query(
        `SELECT id, name, short_code FROM ${SCHEMA}.seating_types`,
        { type: Sequelize.QueryTypes.SELECT }
      );
      
      console.log(`Found ${seatingTypes.length} seating types to process`);
      
      // Define standard seating type short codes
      const standardShortCodes = {
        'HOT_DESK': 'HTD',
        'DEDICATED_DESK': 'DED',
        'MEETING_ROOM': 'MTG',
        'CUBICLE': 'CUB',
        'DAILY_PASS': 'DPS'
      };
      
      // Get all existing short codes
      const existingSeatingTypeCodes = seatingTypes
        .filter(st => st.short_code && st.short_code.length >= 3)
        .map(st => st.short_code);
      
      console.log(`Found ${existingSeatingTypeCodes.length} existing valid seating type short codes`);
      
      // Update seating types with missing or invalid short codes
      let updatedCount = 0;
      for (const seatingType of seatingTypes) {
        // Skip if already has a valid 3+ letter code
        if (seatingType.short_code && seatingType.short_code.length >= 3) {
          continue;
        }
        
        // Use standard code if available, otherwise generate one
        let newShortCode = standardShortCodes[seatingType.name] || 
                         generateShortCode(seatingType.name, existingSeatingTypeCodes);
        
        // Ensure uniqueness
        if (existingSeatingTypeCodes.includes(newShortCode)) {
          let counter = 1;
          let baseCode = newShortCode;
          while (existingSeatingTypeCodes.includes(newShortCode)) {
            newShortCode = baseCode + counter;
            counter++;
          }
        }
        
        existingSeatingTypeCodes.push(newShortCode);
        
        await sequelize.query(
          `UPDATE ${SCHEMA}.seating_types
           SET short_code = :shortCode
           WHERE id = :seatingTypeId`,
          {
            replacements: { 
              seatingTypeId: seatingType.id,
              shortCode: newShortCode
            }
          }
        );
        
        console.log(`Updated seating type "${seatingType.name}" (ID: ${seatingType.id}): short_code set to "${newShortCode}"`);
        updatedCount++;
      }
      
      console.log(`Updated ${updatedCount} seating types with new short codes`);
    } else {
      console.log('short_code column does not exist in seating_types table, skipping seating type short codes');
    }

    console.log('Short codes migration completed successfully');
    await sequelize.close();
  } catch (error) {
    console.error('Migration failed:', error);
    
    // Log more details about the database error
    if (error.code) {
      console.error('Database error details:', {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
    }
    
    // Close connection if it was established
    if (sequelize) {
      try {
        await sequelize.close();
      } catch (closeError) {
        console.error('Error closing database connection:', closeError);
      }
    }
    
    process.exit(1);
  }
}

// Call the run function
run(); 