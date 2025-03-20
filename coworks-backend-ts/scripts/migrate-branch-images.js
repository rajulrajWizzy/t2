require('dotenv').config();
const { Sequelize, DataTypes, Op } = require('sequelize');

const SCHEMA = process.env.DB_SCHEMA || 'public';

// Database connection configuration
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    logging: false
  }
);

// Define the migration name
const MIGRATION_NAME = 'add-branch-images';

// Mapping of seating types to default images
const SEATING_TYPE_IMAGES = {
  'HOT_DESK': [
    '/images/branches/hotdesk-1.jpg',
    '/images/branches/hotdesk-2.jpg',
    '/images/branches/hotdesk-3.jpg'
  ],
  'DEDICATED_DESK': [
    '/images/branches/dedicated-1.jpg',
    '/images/branches/dedicated-2.jpg',
    '/images/branches/dedicated-3.jpg'
  ],
  'MEETING_ROOM': [
    '/images/branches/meeting-1.jpg',
    '/images/branches/meeting-2.jpg',
    '/images/branches/meeting-3.jpg'
  ],
  'CUBICLE': [
    '/images/branches/cubicle-1.jpg',
    '/images/branches/cubicle-2.jpg'
  ],
  'DAILY_PASS': [
    '/images/branches/daily-1.jpg',
    '/images/branches/daily-2.jpg'
  ]
};

// Function to shuffle array (for randomizing image selection)
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

async function run() {
  try {
    // Connect to the database
    await sequelize.authenticate();
    console.log('Connected to database');

    // Set search path to the specified schema
    await sequelize.query(`SET search_path TO ${SCHEMA}`);

    // Check if migration has already been applied
    const [migrations] = await sequelize.query(
      `SELECT * FROM migrations WHERE name = :name`,
      {
        replacements: { name: MIGRATION_NAME },
        type: Sequelize.QueryTypes.SELECT
      }
    );

    if (migrations && migrations.length > 0) {
      console.log(`Migration ${MIGRATION_NAME} has already been applied.`);
      await sequelize.close();
      return;
    }

    // Check if branch_images table exists
    const [branchImagesTable] = await sequelize.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = '${SCHEMA}' 
        AND table_name = 'branch_images'
      )`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    // Create branch_images table if it doesn't exist
    if (!branchImagesTable.exists) {
      console.log('Creating branch_images table');
      await sequelize.query(`
        CREATE TABLE ${SCHEMA}.branch_images (
          id SERIAL PRIMARY KEY,
          branch_id INTEGER NOT NULL REFERENCES ${SCHEMA}.branches(id) ON DELETE CASCADE,
          image_url VARCHAR(255) NOT NULL,
          is_primary BOOLEAN DEFAULT false,
          seating_type VARCHAR(50),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('branch_images table created');
    } else {
      console.log('branch_images table already exists');
    }

    // Get all branches
    const [branches] = await sequelize.query(
      `SELECT id, name FROM ${SCHEMA}.branches`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    console.log(`Found ${branches.length} branches to update`);

    // For each branch, get its seating types
    for (const branch of branches) {
      console.log(`Processing branch: ${branch.name} (ID: ${branch.id})`);
      
      // Get seating types for this branch
      const [branchSeatingTypes] = await sequelize.query(
        `SELECT DISTINCT st.name 
        FROM ${SCHEMA}.seats s
        JOIN ${SCHEMA}.seating_types st ON s.seating_type_id = st.id
        WHERE s.branch_id = :branchId`,
        {
          replacements: { branchId: branch.id },
          type: Sequelize.QueryTypes.SELECT
        }
      );

      if (branchSeatingTypes.length === 0) {
        console.log(`No seating types found for branch ${branch.name}, using default images`);
        
        // Use a default set for branches without seating types
        const defaultImages = [
          '/images/branches/default-1.jpg',
          '/images/branches/default-2.jpg'
        ];
        
        for (const [index, imageUrl] of defaultImages.entries()) {
          await sequelize.query(
            `INSERT INTO ${SCHEMA}.branch_images 
            (branch_id, image_url, is_primary, seating_type) 
            VALUES (:branchId, :imageUrl, :isPrimary, 'DEFAULT')`,
            {
              replacements: { 
                branchId: branch.id, 
                imageUrl, 
                isPrimary: index === 0 
              }
            }
          );
        }
        
        console.log(`Added default images for branch ${branch.name}`);
        continue;
      }

      console.log(`Found seating types for branch ${branch.name}:`, branchSeatingTypes.map(st => st.name).join(', '));

      // Check if branch already has images
      const [existingImages] = await sequelize.query(
        `SELECT COUNT(*) as count FROM ${SCHEMA}.branch_images WHERE branch_id = :branchId`,
        {
          replacements: { branchId: branch.id },
          type: Sequelize.QueryTypes.SELECT
        }
      );

      if (existingImages[0].count > 0) {
        console.log(`Branch ${branch.name} already has ${existingImages[0].count} images, skipping`);
        continue;
      }

      // Track if we've set a primary image
      let hasPrimary = false;

      // Add images for each seating type
      for (const { name: seatingType } of branchSeatingTypes) {
        const images = SEATING_TYPE_IMAGES[seatingType] || SEATING_TYPE_IMAGES['HOT_DESK'];
        
        // Shuffle the images for variety
        const shuffledImages = shuffleArray([...images]);
        
        // Select 1-2 images for this seating type
        const selectedImages = shuffledImages.slice(0, Math.min(2, shuffledImages.length));
        
        for (const imageUrl of selectedImages) {
          // Determine if this should be the primary image (first one encountered)
          const isPrimary = !hasPrimary;
          if (isPrimary) {
            hasPrimary = true;
          }
          
          await sequelize.query(
            `INSERT INTO ${SCHEMA}.branch_images 
            (branch_id, image_url, is_primary, seating_type) 
            VALUES (:branchId, :imageUrl, :isPrimary, :seatingType)`,
            {
              replacements: { 
                branchId: branch.id, 
                imageUrl, 
                isPrimary,
                seatingType
              }
            }
          );
          
          console.log(`Added ${isPrimary ? 'primary' : 'secondary'} image for branch ${branch.name}, seating type ${seatingType}: ${imageUrl}`);
        }
      }
    }

    // Record the migration
    await sequelize.query(
      `INSERT INTO ${SCHEMA}.migrations (name, applied_at) VALUES (:name, NOW())`,
      { replacements: { name: MIGRATION_NAME } }
    );

    console.log(`Migration ${MIGRATION_NAME} has been successfully applied.`);
    await sequelize.close();

  } catch (error) {
    console.error('Error applying migration:', error);
    await sequelize.close();
    process.exit(1);
  }
}

run(); 