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
const MIGRATION_NAME = 'add-user-profile-pictures';

// List of available profile picture templates
const PROFILE_PICTURES = [
  '/images/profiles/avatar-1.jpg',
  '/images/profiles/avatar-2.jpg',
  '/images/profiles/avatar-3.jpg',
  '/images/profiles/avatar-4.jpg',
  '/images/profiles/avatar-5.jpg',
  '/images/profiles/avatar-6.jpg',
  '/images/profiles/avatar-7.jpg',
  '/images/profiles/avatar-8.jpg',
  '/images/profiles/avatar-9.jpg',
  '/images/profiles/avatar-10.jpg',
  '/images/profiles/avatar-11.jpg',
  '/images/profiles/avatar-12.jpg'
];

// Function to get a random item from an array
function getRandomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
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

    // Check if profile_picture column exists in customers table
    const [customerColumns] = await sequelize.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = '${SCHEMA}' 
        AND table_name = 'customers'
        AND column_name = 'profile_picture'
      )`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    // Add profile_picture column if it doesn't exist
    if (!customerColumns.exists) {
      console.log('Adding profile_picture column to customers table');
      await sequelize.query(`
        ALTER TABLE ${SCHEMA}.customers
        ADD COLUMN profile_picture VARCHAR(255) DEFAULT NULL
      `);
      console.log('profile_picture column added to customers table');
    } else {
      console.log('profile_picture column already exists in customers table');
    }

    // Get all customers
    const [customers] = await sequelize.query(
      `SELECT id, name, email FROM ${SCHEMA}.customers`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    console.log(`Found ${customers.length} customers to update`);

    // Add profile pictures to customers
    let updatedCount = 0;
    for (const customer of customers) {
      // Check if customer already has a profile picture
      const [customerData] = await sequelize.query(
        `SELECT profile_picture FROM ${SCHEMA}.customers WHERE id = :customerId`,
        {
          replacements: { customerId: customer.id },
          type: Sequelize.QueryTypes.SELECT
        }
      );

      if (customerData.profile_picture) {
        console.log(`Customer ${customer.name} already has a profile picture, skipping`);
        continue;
      }

      // Assign a random profile picture
      const profilePicture = getRandomItem(PROFILE_PICTURES);
      
      await sequelize.query(
        `UPDATE ${SCHEMA}.customers
         SET profile_picture = :profilePicture
         WHERE id = :customerId`,
        {
          replacements: { 
            customerId: customer.id,
            profilePicture
          }
        }
      );
      
      console.log(`Added profile picture to customer ${customer.name} (ID: ${customer.id}): ${profilePicture}`);
      updatedCount++;
    }

    console.log(`Updated ${updatedCount} customers with profile pictures`);

    // Check if staff table exists
    const [staffTable] = await sequelize.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = '${SCHEMA}' 
        AND table_name = 'staff'
      )`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (staffTable.exists) {
      // Check if profile_picture column exists in staff table
      const [staffColumns] = await sequelize.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = '${SCHEMA}' 
          AND table_name = 'staff'
          AND column_name = 'profile_picture'
        )`,
        { type: Sequelize.QueryTypes.SELECT }
      );

      // Add profile_picture column if it doesn't exist
      if (!staffColumns.exists) {
        console.log('Adding profile_picture column to staff table');
        await sequelize.query(`
          ALTER TABLE ${SCHEMA}.staff
          ADD COLUMN profile_picture VARCHAR(255) DEFAULT NULL
        `);
        console.log('profile_picture column added to staff table');
      } else {
        console.log('profile_picture column already exists in staff table');
      }

      // Get all staff
      const [staffMembers] = await sequelize.query(
        `SELECT id, name, email FROM ${SCHEMA}.staff`,
        { type: Sequelize.QueryTypes.SELECT }
      );

      console.log(`Found ${staffMembers.length} staff members to update`);

      // Add profile pictures to staff
      updatedCount = 0;
      for (const staff of staffMembers) {
        // Check if staff already has a profile picture
        const [staffData] = await sequelize.query(
          `SELECT profile_picture FROM ${SCHEMA}.staff WHERE id = :staffId`,
          {
            replacements: { staffId: staff.id },
            type: Sequelize.QueryTypes.SELECT
          }
        );

        if (staffData.profile_picture) {
          console.log(`Staff ${staff.name} already has a profile picture, skipping`);
          continue;
        }

        // Assign a random profile picture
        const profilePicture = getRandomItem(PROFILE_PICTURES);
        
        await sequelize.query(
          `UPDATE ${SCHEMA}.staff
           SET profile_picture = :profilePicture
           WHERE id = :staffId`,
          {
            replacements: { 
              staffId: staff.id,
              profilePicture
            }
          }
        );
        
        console.log(`Added profile picture to staff ${staff.name} (ID: ${staff.id}): ${profilePicture}`);
        updatedCount++;
      }

      console.log(`Updated ${updatedCount} staff members with profile pictures`);
    } else {
      console.log('staff table does not exist, skipping staff profile pictures');
    }

    // Add profile_picture to users table if it exists
    const [usersTable] = await sequelize.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = '${SCHEMA}' 
        AND table_name = 'users'
      )`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (usersTable.exists) {
      // Check if profile_picture column exists in users table
      const [usersColumns] = await sequelize.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = '${SCHEMA}' 
          AND table_name = 'users'
          AND column_name = 'profile_picture'
        )`,
        { type: Sequelize.QueryTypes.SELECT }
      );

      // Add profile_picture column if it doesn't exist
      if (!usersColumns.exists) {
        console.log('Adding profile_picture column to users table');
        await sequelize.query(`
          ALTER TABLE ${SCHEMA}.users
          ADD COLUMN profile_picture VARCHAR(255) DEFAULT NULL
        `);
        console.log('profile_picture column added to users table');
      } else {
        console.log('profile_picture column already exists in users table');
      }

      // Get all users
      const [users] = await sequelize.query(
        `SELECT id, username, email FROM ${SCHEMA}.users`,
        { type: Sequelize.QueryTypes.SELECT }
      );

      console.log(`Found ${users.length} users to update`);

      // Add profile pictures to users
      updatedCount = 0;
      for (const user of users) {
        // Check if user already has a profile picture
        const [userData] = await sequelize.query(
          `SELECT profile_picture FROM ${SCHEMA}.users WHERE id = :userId`,
          {
            replacements: { userId: user.id },
            type: Sequelize.QueryTypes.SELECT
          }
        );

        if (userData.profile_picture) {
          console.log(`User ${user.username || user.email} already has a profile picture, skipping`);
          continue;
        }

        // Assign a random profile picture
        const profilePicture = getRandomItem(PROFILE_PICTURES);
        
        await sequelize.query(
          `UPDATE ${SCHEMA}.users
           SET profile_picture = :profilePicture
           WHERE id = :userId`,
          {
            replacements: { 
              userId: user.id,
              profilePicture
            }
          }
        );
        
        console.log(`Added profile picture to user ${user.username || user.email} (ID: ${user.id}): ${profilePicture}`);
        updatedCount++;
      }

      console.log(`Updated ${updatedCount} users with profile pictures`);
    } else {
      console.log('users table does not exist, skipping user profile pictures');
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