/**
 * Migration to fix time_slots table structure
 * 
 * This migration ensures the time_slots table has the correct column structure
 * and data types as defined in the TimeSlot model.
 */

const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface, sequelize) {
    const schema = process.env.DB_SCHEMA || 'excel_coworks_schema';
    
    try {
      // Check if time_slots table exists
      const [tableExists] = await queryInterface.sequelize.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = '${schema}' 
          AND table_name = 'time_slots'
        );
      `);
      
      if (!tableExists[0].exists) {
        console.log('Creating time_slots table...');
        await queryInterface.createTable('time_slots', {
          id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
          },
          branch_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
              model: 'branches',
              key: 'id',
            },
          },
          seat_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
              model: 'seats',
              key: 'id',
            },
          },
          date: {
            type: DataTypes.DATEONLY,
            allowNull: false,
          },
          start_time: {
            type: DataTypes.TIME,
            allowNull: false,
          },
          end_time: {
            type: DataTypes.TIME,
            allowNull: false,
          },
          is_available: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
          },
          booking_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
              model: 'seat_bookings',
              key: 'id',
            },
          },
          created_at: {
            type: DataTypes.DATE,
            defaultValue: sequelize.fn('NOW'),
          },
          updated_at: {
            type: DataTypes.DATE,
            defaultValue: sequelize.fn('NOW'),
          },
        }, {
          schema
        });
      } else {
        // Check if date column exists
        const [dateColumnExists] = await queryInterface.sequelize.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = '${schema}' 
            AND table_name = 'time_slots'
            AND column_name = 'date'
          );
        `);
        
        if (!dateColumnExists[0].exists) {
          console.log('Adding date column to time_slots table...');
          await queryInterface.addColumn(
            { tableName: 'time_slots', schema },
            'date',
            {
              type: DataTypes.DATEONLY,
              allowNull: false,
              defaultValue: sequelize.fn('CURRENT_DATE')
            }
          );
        }
        
        // Fix start_time and end_time column types if needed
        await queryInterface.sequelize.query(`
          ALTER TABLE "${schema}"."time_slots"
          ALTER COLUMN start_time TYPE TIME USING start_time::time,
          ALTER COLUMN end_time TYPE TIME USING end_time::time;
        `);
      }
      
      console.log('✅ Time slots table structure has been fixed');
    } catch (error) {
      console.error('❌ Error fixing time_slots table:', error);
      throw error;
    }
  },
  
  async down(queryInterface, Sequelize) {
    // This migration is not reversible as it fixes data structure
    console.log('This migration cannot be reversed');
  }
};