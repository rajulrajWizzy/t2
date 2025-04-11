const { Sequelize } = require('sequelize');
const migration = require('../migrations/add-payment-id-to-seat-bookings');

async function runMigration() {
  // Create a Sequelize instance using your database connection string
  const sequelize = new Sequelize(process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/excel_coworks', {
    dialect: 'postgres',
    logging: console.log,
    dialectOptions: {
      // Set the default schema
      prependSearchPath: true
    }
  });

  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');

    // Ensure we're using the correct schema
    await sequelize.query('SET search_path TO excel_coworks_schema');
    console.log('Set search path to excel_coworks_schema');

    // Create the queryInterface object needed by the migration
    const queryInterface = sequelize.getQueryInterface();

    // Run the migration
    console.log('Running migration to add payment_id column to seat_bookings table...');
    await migration.up(queryInterface, Sequelize);
    console.log('Migration completed successfully!');

  } catch (error) {
    console.error('Error running migration:', error);
  } finally {
    // Close the database connection
    await sequelize.close();
  }
}

runMigration(); 