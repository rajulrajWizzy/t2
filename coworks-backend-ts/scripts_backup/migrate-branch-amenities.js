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
const MIGRATION_NAME = 'add-branch-amenities';

// List of available amenities
const AMENITIES = [
  { name: 'WiFi', icon: 'wifi', description: 'High-speed wireless internet' },
  { name: 'Parking', icon: 'car', description: 'On-site parking available' },
  { name: 'Coffee', icon: 'coffee', description: 'Complimentary coffee and tea' },
  { name: 'Meeting Rooms', icon: 'meeting-room', description: 'Dedicated meeting spaces' },
  { name: 'Printing', icon: 'print', description: 'Print, scan, and copy services' },
  { name: 'Lounge', icon: 'sofa', description: 'Comfortable lounge area' },
  { name: 'Kitchen', icon: 'kitchen', description: 'Fully equipped kitchen' },
  { name: '24/7 Access', icon: 'clock', description: 'Around-the-clock building access' },
  { name: 'Mail Services', icon: 'mail', description: 'Mail handling and package acceptance' },
  { name: 'Phone Booths', icon: 'phone', description: 'Private phone booths' },
  { name: 'Bike Storage', icon: 'bike', description: 'Secure bicycle storage' },
  { name: 'Gym Access', icon: 'gym', description: 'Fitness center access' },
  { name: 'Showers', icon: 'shower', description: 'On-site showers' },
  { name: 'Snacks', icon: 'food', description: 'Complimentary snacks' },
  { name: 'Reception', icon: 'reception', description: 'Reception services during business hours' },
  { name: 'Events Space', icon: 'event', description: 'Space for hosting events' },
  { name: 'IT Support', icon: 'support', description: 'Technical support available' },
  { name: 'Security', icon: 'security', description: '24/7 security monitoring' }
];

// Function to shuffle array (for randomizing amenities)
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

    // Check if amenities table exists
    const [amenitiesTable] = await sequelize.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = '${SCHEMA}' 
        AND table_name = 'amenities'
      )`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    // Create amenities table if it doesn't exist
    if (!amenitiesTable.exists) {
      console.log('Creating amenities table');
      await sequelize.query(`
        CREATE TABLE ${SCHEMA}.amenities (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          icon VARCHAR(50),
          description TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('amenities table created');

      // Insert predefined amenities
      for (const amenity of AMENITIES) {
        await sequelize.query(
          `INSERT INTO ${SCHEMA}.amenities (name, icon, description) 
          VALUES (:name, :icon, :description)`,
          {
            replacements: amenity
          }
        );
      }
      console.log(`${AMENITIES.length} amenities inserted`);
    } else {
      console.log('amenities table already exists');
    }

    // Check if branch_amenities table exists
    const [branchAmenitiesTable] = await sequelize.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = '${SCHEMA}' 
        AND table_name = 'branch_amenities'
      )`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    // Create branch_amenities table if it doesn't exist
    if (!branchAmenitiesTable.exists) {
      console.log('Creating branch_amenities table');
      await sequelize.query(`
        CREATE TABLE ${SCHEMA}.branch_amenities (
          id SERIAL PRIMARY KEY,
          branch_id INTEGER NOT NULL REFERENCES ${SCHEMA}.branches(id) ON DELETE CASCADE,
          amenity_id INTEGER NOT NULL REFERENCES ${SCHEMA}.amenities(id) ON DELETE CASCADE,
          details TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(branch_id, amenity_id)
        )
      `);
      console.log('branch_amenities table created');
    } else {
      console.log('branch_amenities table already exists');
    }

    // Get all branches
    const branches = await sequelize.query(
      `SELECT id, name FROM ${SCHEMA}.branches`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    console.log(`Found ${branches.length} branches to update`);

    // Get all amenities
    const amenities = await sequelize.query(
      `SELECT id, name, icon FROM ${SCHEMA}.amenities`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    // For each branch, assign amenities
    for (const branch of branches) {
      console.log(`Processing branch: ${branch.name} (ID: ${branch.id})`);
      
      // Check if branch already has amenities
      const [existingAmenities] = await sequelize.query(
        `SELECT COUNT(*) as count FROM ${SCHEMA}.branch_amenities WHERE branch_id = :branchId`,
        {
          replacements: { branchId: branch.id },
          type: Sequelize.QueryTypes.SELECT
        }
      );

      if (existingAmenities.count > 0) {
        console.log(`Branch ${branch.name} already has amenities, skipping`);
        continue;
      }

      // Shuffle amenities and select 6-12 random ones for this branch
      const shuffledAmenities = shuffleArray([...amenities]);
      const amenityCount = Math.floor(Math.random() * 7) + 6; // 6-12 amenities
      const selectedAmenities = shuffledAmenities.slice(0, amenityCount);
      
      // Add standard amenities that every branch should have
      const standardAmenityNames = ['WiFi', 'Coffee', 'Printing'];
      const standardAmenities = amenities.filter(a => standardAmenityNames.includes(a.name));
      
      // Combine and de-duplicate
      const finalAmenities = [...new Map(
        [...standardAmenities, ...selectedAmenities].map(item => [item.id, item])
      ).values()];

      // Assign amenities to branch
      for (const amenity of finalAmenities) {
        await sequelize.query(
          `INSERT INTO ${SCHEMA}.branch_amenities (branch_id, amenity_id) 
          VALUES (:branchId, :amenityId)`,
          {
            replacements: { 
              branchId: branch.id, 
              amenityId: amenity.id
            }
          }
        );
        
        console.log(`Added amenity '${amenity.name}' to branch ${branch.name}`);
      }
      
      console.log(`Assigned ${finalAmenities.length} amenities to branch ${branch.name}`);
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