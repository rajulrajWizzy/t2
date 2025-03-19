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

async function addBranchShortCode() {
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
        WHERE name = 'add_branch_short_code'
      );
    `, { type: Sequelize.QueryTypes.SELECT });
    
    if (migrationExists[0].exists) {
      console.log('Migration for branch short_code has already been applied. Skipping...');
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

    if (shortCodeExists[0].exists) {
      console.log('short_code column already exists in branches table');
    } else {
      // Add short_code column to branches table
      await sequelize.query(`
        ALTER TABLE "${dbSchema}"."branches"
        ADD COLUMN short_code VARCHAR(10) UNIQUE;
      `);
      console.log('Added short_code column to branches table');
      
      // Generate short codes for existing branches
      const branches = await sequelize.query(`
        SELECT id, name FROM "${dbSchema}"."branches";
      `, { type: Sequelize.QueryTypes.SELECT });
      
      for (const branch of branches) {
        const namePrefix = branch.name
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '')
          .slice(0, 3)
          .toUpperCase();
        
        const randomChars = Math.random().toString(36).substring(2, 5).toUpperCase();
        const shortCode = `${namePrefix}${randomChars}`;
        
        await sequelize.query(`
          UPDATE "${dbSchema}"."branches"
          SET short_code = '${shortCode}'
          WHERE id = ${branch.id};
        `);
      }
      
      console.log(`Generated short codes for ${branches.length} existing branches`);
    }

    // Record the migration
    await sequelize.query(`
      INSERT INTO "${dbSchema}"."migrations" (name, applied_at)
      VALUES ('add_branch_short_code', NOW());
    `);
    console.log('Recorded migration for branch short_code');

    console.log('Migration completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error in migration:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

addBranchShortCode(); 