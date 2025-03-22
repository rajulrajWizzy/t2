'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Get the database schema (useful for multi-schema setups)
      const [schemaResults] = await queryInterface.sequelize.query(`
        SELECT current_schema() as schema;
      `);
      const dbSchema = schemaResults[0].schema;
      
      // Create a mapping of branch locations to short codes
      const branchShortCodes = {
        'Outer Ring Road': 'orr',
        'Electronic City': 'ec',
        'Whitefield': 'wtf',
        'Indiranagar': 'ind',
        'Koramangala': 'kor',
        'Jayanagar': 'jay',
        'MG Road': 'mgr',
        'HSR Layout': 'hsr',
        'Marathahalli': 'mrt',
        'Naagarbhaavi': 'ngb'
      };
      
      // Get all branches from the database
      const branches = await queryInterface.sequelize.query(`
        SELECT id, name, location FROM "${dbSchema}"."branches";
      `, { type: Sequelize.QueryTypes.SELECT });
      
      console.log(`Found ${branches.length} branches to update`);
      
      // Update each branch with a matching short code
      for (const branch of branches) {
        let shortCode = null;
        
        // First try exact location match
        Object.entries(branchShortCodes).forEach(([location, code]) => {
          if (branch.location && branch.location.toLowerCase().includes(location.toLowerCase())) {
            shortCode = code;
          }
        });
        
        // If no match found, use first 3 characters of location or name
        if (!shortCode) {
          if (branch.location && branch.location.trim()) {
            shortCode = branch.location.trim().replace(/\s+/g, '').substring(0, 3).toLowerCase();
          } else if (branch.name && branch.name.trim()) {
            shortCode = branch.name.trim().replace(/\s+/g, '').substring(0, 3).toLowerCase();
          } else {
            shortCode = `br${branch.id}`; // Fallback
          }
        }
        
        // Update the branch record
        await queryInterface.sequelize.query(`
          UPDATE "${dbSchema}"."branches"
          SET short_code = '${shortCode}'
          WHERE id = ${branch.id} AND (short_code IS NULL OR short_code = '');
        `);
        
        console.log(`Updated branch ID ${branch.id} (${branch.name || branch.location}) with short code '${shortCode}'`);
      }
      
      console.log('Branch short codes updated successfully');
      
    } catch (error) {
      console.error('Error updating branch short codes:', error);
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
      
      // This will set all short_codes to null - destructive operation
      // Use with caution - you might want to back up the data first
      await queryInterface.sequelize.query(`
        UPDATE "${dbSchema}"."branches"
        SET short_code = NULL;
      `);
      
      console.log('Branch short codes reset to NULL');
      
    } catch (error) {
      console.error('Error resetting branch short codes:', error);
      throw error;
    }
  }
}; 