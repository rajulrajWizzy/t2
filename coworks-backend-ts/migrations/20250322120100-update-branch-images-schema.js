'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Get the database schema
      const [schemaResults] = await queryInterface.sequelize.query(`
        SELECT current_schema() as schema;
      `);
      const dbSchema = schemaResults[0].schema;
      
      // Check if branch_images table exists
      const [tables] = await queryInterface.sequelize.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = '${dbSchema}' AND table_name = 'branch_images';
      `);
      
      if (tables.length === 0) {
        // Create branch_images table if it doesn't exist
        await queryInterface.createTable('branch_images', {
          id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
          },
          branch_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: 'branches',
              key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
          },
          seating_type_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: 'seating_types',
              key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
          },
          image_url: {
            type: Sequelize.STRING,
            allowNull: false
          },
          image_order: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 1
          },
          created_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
          },
          updated_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
          }
        });
        
        console.log('Created branch_images table');
        
        // Create indexes
        await queryInterface.addIndex('branch_images', ['branch_id']);
        await queryInterface.addIndex('branch_images', ['seating_type_id']);
        await queryInterface.addIndex('branch_images', ['branch_id', 'seating_type_id']);
        
        console.log('Added indexes to branch_images table');
      } else {
        // Check if the table has seating_type_id column
        const [columns] = await queryInterface.sequelize.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_schema = '${dbSchema}' AND table_name = 'branch_images' AND column_name = 'seating_type_id';
        `);
        
        if (columns.length === 0) {
          // Add seating_type_id column if it doesn't exist
          await queryInterface.addColumn('branch_images', 'seating_type_id', {
            type: Sequelize.INTEGER,
            allowNull: true, // Allow NULL initially for existing records
            references: {
              model: 'seating_types',
              key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
          });
          
          console.log('Added seating_type_id column to branch_images table');
          
          // Attempt to add index
          try {
            await queryInterface.addIndex('branch_images', ['seating_type_id']);
            await queryInterface.addIndex('branch_images', ['branch_id', 'seating_type_id']);
            console.log('Added indexes for seating_type_id to branch_images table');
          } catch (error) {
            console.warn('Error adding indexes:', error.message);
          }
          
          // Update existing images with a default seating type (e.g., HOT_DESK)
          try {
            // Get the ID of the HOT_DESK seating type
            const [seatingTypes] = await queryInterface.sequelize.query(`
              SELECT id FROM "${dbSchema}"."seating_types" WHERE name = 'HOT_DESK' LIMIT 1;
            `, { type: Sequelize.QueryTypes.SELECT });
            
            if (seatingTypes.length > 0) {
              const hotDeskId = seatingTypes[0].id;
              
              // Update all existing images
              await queryInterface.sequelize.query(`
                UPDATE "${dbSchema}"."branch_images" 
                SET seating_type_id = ${hotDeskId}
                WHERE seating_type_id IS NULL;
              `);
              
              console.log('Updated existing branch images with HOT_DESK seating type');
            }
          } catch (error) {
            console.warn('Error updating existing images:', error.message);
          }
        }
        
        // Check if the table has image_order column
        const [orderColumns] = await queryInterface.sequelize.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_schema = '${dbSchema}' AND table_name = 'branch_images' AND column_name = 'image_order';
        `);
        
        if (orderColumns.length === 0) {
          // Add image_order column if it doesn't exist
          await queryInterface.addColumn('branch_images', 'image_order', {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 1
          });
          
          console.log('Added image_order column to branch_images table');
        }
      }
      
      console.log('Branch images schema updated successfully');
      
    } catch (error) {
      console.error('Error updating branch images schema:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      // Get the database schema
      const [schemaResults] = await queryInterface.sequelize.query(`
        SELECT current_schema() as schema;
      `);
      const dbSchema = schemaResults[0].schema;
      
      // Check if branch_images table exists
      const [tables] = await queryInterface.sequelize.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = '${dbSchema}' AND table_name = 'branch_images';
      `);
      
      if (tables.length > 0) {
        // Check if the table has seating_type_id column
        const [columns] = await queryInterface.sequelize.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_schema = '${dbSchema}' AND table_name = 'branch_images' AND column_name = 'seating_type_id';
        `);
        
        if (columns.length > 0) {
          // Remove the indexes first if they exist
          try {
            await queryInterface.removeIndex('branch_images', ['branch_id', 'seating_type_id']);
            await queryInterface.removeIndex('branch_images', ['seating_type_id']);
            console.log('Removed indexes from branch_images table');
          } catch (error) {
            console.warn('Error removing indexes:', error.message);
          }
          
          // Remove the seating_type_id column
          await queryInterface.removeColumn('branch_images', 'seating_type_id');
          console.log('Removed seating_type_id column from branch_images table');
        }
        
        // Check if the table has image_order column
        const [orderColumns] = await queryInterface.sequelize.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_schema = '${dbSchema}' AND table_name = 'branch_images' AND column_name = 'image_order';
        `);
        
        if (orderColumns.length > 0) {
          // Remove the image_order column
          await queryInterface.removeColumn('branch_images', 'image_order');
          console.log('Removed image_order column from branch_images table');
        }
      }
      
      console.log('Branch images schema reverted successfully');
      
    } catch (error) {
      console.error('Error reverting branch images schema:', error);
      throw error;
    }
  }
}; 