/**
 * Migration Script Generator
 * 
 * This utility script helps create new migration files with proper naming
 * conventions and boilerplate code structure.
 * 
 * Usage:
 *   node scripts/create-migration.js "description-of-migration"
 * 
 * Example:
 *   node scripts/create-migration.js "add-user-preferences"
 */

const fs = require('fs');
const path = require('path');

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

// Helper function for logging
function log(message, color = colors.reset) {
  console.log(`${color}[create-migration] ${message}${colors.reset}`);
}

// Get migration description from command line arguments
const args = process.argv.slice(2);
if (args.length === 0) {
  log('Error: No migration description provided', colors.red);
  log('Usage: node scripts/create-migration.js "description-of-migration"', colors.yellow);
  process.exit(1);
}

// Create migration name from description
const description = args[0].toLowerCase().trim().replace(/\s+/g, '-');

// Generate timestamp for migration file (format: YYYYMMDDHHMMSS)
const now = new Date();
const timestamp = [
  now.getFullYear(),
  String(now.getMonth() + 1).padStart(2, '0'),
  String(now.getDate()).padStart(2, '0'),
  String(now.getHours()).padStart(2, '0'),
  String(now.getMinutes()).padStart(2, '0'),
  String(now.getSeconds()).padStart(2, '0')
].join('');

const migrationFileName = `${timestamp}-${description}.js`;
const migrationPath = path.join(__dirname, '..', 'migrations', migrationFileName);

// Migration file template
const migrationTemplate = `'use strict';

/**
 * Migration: ${description}
 * Generated: ${new Date().toISOString()}
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      // Set schema
      const dbSchema = process.env.DB_SCHEMA || 'public';
      await queryInterface.sequelize.query(\`SET search_path TO "\${dbSchema}";\`);
      
      // Implement your migration logic here
      // Example:
      // await queryInterface.addColumn('users', 'preferences', {
      //   type: Sequelize.JSONB,
      //   allowNull: true,
      //   defaultValue: null
      // });
      
      // Create indexes if needed
      // Example:
      // await queryInterface.addIndex('users', ['preferences'], {
      //   name: 'idx_users_preferences'
      // });
      
      // Record this migration
      await queryInterface.sequelize.query(\`
        INSERT INTO "\${dbSchema}"."migrations" (name, applied_at)
        VALUES ('${description}', NOW())
        ON CONFLICT (name) DO NOTHING;
      \`);
    } catch (error) {
      console.error(\`Migration error: \${error.message}\`);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      // Implement rollback logic here
      // Example:
      // await queryInterface.removeColumn('users', 'preferences');
    } catch (error) {
      console.error(\`Rollback error: \${error.message}\`);
      throw error;
    }
  }
};
`;

// Create migration file
try {
  // Check if migrations directory exists, create if not
  const migrationsDir = path.join(__dirname, '..', 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    fs.mkdirSync(migrationsDir, { recursive: true });
    log(`Created migrations directory: ${migrationsDir}`, colors.green);
  }
  
  // Write migration file
  fs.writeFileSync(migrationPath, migrationTemplate);
  log(`Migration file created: ${migrationFileName}`, colors.green);
  log(`Full path: ${migrationPath}`, colors.cyan);
} catch (error) {
  log(`Error creating migration file: ${error.message}`, colors.red);
  process.exit(1);
} 