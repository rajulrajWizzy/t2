const { Sequelize } = require('sequelize');
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
        ssl: process.env.DB_SSL === 'true' ? {
          require: true,
          rejectUnauthorized: false
        } : undefined
      }
    }
  );
}

// Function to generate a standardized short code from a name
function generateBranchShortCode(name, id) {
  // Take first 3 letters of name, remove spaces and special characters
  const namePrefix = name
    .replace(/[^a-zA-Z0-9]/g, '')  // Remove special characters
    .slice(0, 3)                   // Take first 3 chars
    .toUpperCase();                // Convert to uppercase
  
  // Pad ID with zeros to make it 3 digits
  const idPart = String(id).padStart(3, '0');
  
  return `${namePrefix}${idPart}`;
}

async function updateBranchShortCodes() {
  try {
    // Connect to database
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');

    // Set search path to ensure correct schema
    await sequelize.query(`SET search_path TO "${dbSchema}";`);
    console.log(`Search path set to: ${dbSchema}`);
    
    // Check if migration has already been applied
    const migrationExists = await sequelize.query(`
      SELECT EXISTS (
        SELECT 1 FROM "${dbSchema}"."migrations" 
        WHERE name = 'update_branch_short_codes'
      );
    `, { type: Sequelize.QueryTypes.SELECT });
    
    if (migrationExists[0].exists) {
      console.log('Migration for updating branch short codes has already been applied. Skipping...');
      process.exit(0);
      return;
    }

    // Check if short_code column exists in branches table
    const shortCodeExists = await sequelize.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = '${dbSchema}'
        AND table_name = 'branches'
        AND column_name = 'short_code'
      );
    `, { type: Sequelize.QueryTypes.SELECT });

    if (!shortCodeExists[0].exists) {
      console.log('short_code column does not exist in branches table. Running short_code migration first...');
      
      // Add short_code column
      await sequelize.query(`
        ALTER TABLE "${dbSchema}"."branches"
        ADD COLUMN short_code VARCHAR(10) UNIQUE;
      `);
      console.log('Added short_code column to branches table');
    }

    // Get all branches
    const branches = await sequelize.query(`
      SELECT id, name FROM "${dbSchema}"."branches";
    `, { type: Sequelize.QueryTypes.SELECT });
    
    console.log(`Found ${branches.length} branches to update`);
    
    // Update short codes for each branch
    for (const branch of branches) {
      const shortCode = generateBranchShortCode(branch.name, branch.id);
      
      // Update the branch with the new short code
      await sequelize.query(`
        UPDATE "${dbSchema}"."branches"
        SET short_code = '${shortCode}'
        WHERE id = ${branch.id};
      `);
      
      console.log(`Updated branch ${branch.id} (${branch.name}) with short code: ${shortCode}`);
    }
    
    // Record the migration
    await sequelize.query(`
      INSERT INTO "${dbSchema}"."migrations" (name, applied_at)
      VALUES ('update_branch_short_codes', NOW());
    `);
    console.log('Recorded migration for branch short code updates');

    console.log('Migration completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error in migration:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

updateBranchShortCodes(); 