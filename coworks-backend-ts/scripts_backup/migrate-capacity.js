// Import required modules
require('dotenv').config();
const { Sequelize, DataTypes, QueryTypes } = require('sequelize');
const path = require('path');
const fs = require('fs');

// Connection configuration
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: {
    ssl: process.env.NODE_ENV === 'production' ? {
      require: true,
      rejectUnauthorized: false
    } : false
  }
});

async function runMigration() {
  try {
    console.log('Connecting to the database...');
    await sequelize.authenticate();
    console.log('Connection has been established successfully.');

    console.log('Starting capacity configuration...');
    
    // Update seating type records with capacity options
    // For CUBICLE - 1, 2, 4, 6, 8
    // For MEETING_ROOM - 4, 6, 8, 10, 12, 16, 20
    
    const updateSeatingTypeQuery = `
      UPDATE "seating_types" 
      SET "capacity_options" = CASE 
        WHEN "name" = 'CUBICLE' THEN '[1, 2, 4, 6, 8]'::jsonb
        WHEN "name" = 'MEETING_ROOM' THEN '[4, 6, 8, 10, 12, 16, 20]'::jsonb
        ELSE NULL
      END
      WHERE "name" IN ('CUBICLE', 'MEETING_ROOM');
    `;
    
    await sequelize.query(updateSeatingTypeQuery);
    console.log('Seating type capacity options updated');

    // Set default capacity for existing seats
    const updateSeatCapacityQuery = `
      UPDATE "seats" s
      SET "capacity" = CASE
        WHEN st."name" = 'CUBICLE' THEN 4
        WHEN st."name" = 'MEETING_ROOM' THEN 8
        ELSE NULL
      END,
      "is_configurable" = CASE
        WHEN st."name" IN ('CUBICLE', 'MEETING_ROOM') THEN true
        ELSE false
      END
      FROM "seating_types" st
      WHERE s."seating_type_id" = st."id"
      AND st."name" IN ('CUBICLE', 'MEETING_ROOM');
    `;
    
    await sequelize.query(updateSeatCapacityQuery);
    console.log('Seat capacity and configurability updated');

    console.log('Capacity configuration completed successfully!');

  } catch (error) {
    console.error('Error running capacity configuration:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
    console.log('Database connection closed.');
  }
}

runMigration(); 