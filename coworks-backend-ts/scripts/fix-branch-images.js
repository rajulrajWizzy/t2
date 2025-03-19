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

async function fixBranchImages() {
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
        WHERE name = 'fix_branch_images'
      );
    `, { type: Sequelize.QueryTypes.SELECT });
    
    if (migrationExists[0].exists) {
      console.log('Migration for fixing branch images has already been applied. Skipping...');
      process.exit(0);
      return;
    }

    // First, check if images column exists in the branches table
    const imagesColumnExists = await sequelize.query(`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = '${dbSchema}' 
        AND table_name = 'branches' 
        AND column_name = 'images'
      );
    `, { type: Sequelize.QueryTypes.SELECT });

    if (!imagesColumnExists[0].exists) {
      // If images column doesn't exist, add it
      await sequelize.query(`
        ALTER TABLE "${dbSchema}"."branches"
        ADD COLUMN images JSONB;
      `);
      console.log('Added images column to branches table');
    } else {
      console.log('Images column already exists in branches table');
    }

    // Check for any views or function references to p.images
    console.log('Checking for any views or functions that might use p.images...');
    
    // List all views that might reference p.images
    const views = await sequelize.query(`
      SELECT viewname 
      FROM pg_catalog.pg_views 
      WHERE schemaname = '${dbSchema}';
    `, { type: Sequelize.QueryTypes.SELECT });

    // Fix any views that reference p.images
    for (const view of views) {
      const viewDefinition = await sequelize.query(`
        SELECT definition 
        FROM pg_catalog.pg_views 
        WHERE schemaname = '${dbSchema}'
        AND viewname = '${view.viewname}';
      `, { type: Sequelize.QueryTypes.SELECT });
      
      if (viewDefinition[0]?.definition?.includes('p.images')) {
        console.log(`Found reference to p.images in view ${view.viewname}`);
        
        // Drop and recreate the view with corrected references
        await sequelize.query(`
          DROP VIEW "${dbSchema}"."${view.viewname}";
        `);
        
        // Create a modified view definition with correct references
        const modifiedDefinition = viewDefinition[0].definition
          .replace(/p\.images/g, 'branches.images')
          .replace(/\bAS\s+p\b/gi, 'AS branches');
        
        await sequelize.query(modifiedDefinition);
        console.log(`Fixed view ${view.viewname}`);
      }
    }

    // Create a temporary function to check if the branches table is properly accessible
    await sequelize.query(`
      CREATE OR REPLACE FUNCTION "${dbSchema}".test_branch_images()
      RETURNS TABLE (
        id INT,
        name TEXT,
        has_images BOOLEAN
      ) AS $$
      BEGIN
        RETURN QUERY
        SELECT 
          b.id,
          b.name,
          (b.images IS NOT NULL) AS has_images
        FROM "${dbSchema}"."branches" b
        LIMIT 5;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    // Test if the function works
    try {
      await sequelize.query(`SELECT * FROM "${dbSchema}".test_branch_images();`);
      console.log('Branch images access test successful');
    } catch (error) {
      console.error('Error in branch images access test:', error);
    }
    
    // Drop the test function
    await sequelize.query(`DROP FUNCTION IF EXISTS "${dbSchema}".test_branch_images();`);

    // Record the migration
    await sequelize.query(`
      INSERT INTO "${dbSchema}"."migrations" (name, applied_at)
      VALUES ('fix_branch_images', NOW());
    `);
    console.log('Recorded migration for fixing branch images');

    console.log('Migration completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error in migration:', error);
    process.exit(1);
  }
}

fixBranchImages(); 