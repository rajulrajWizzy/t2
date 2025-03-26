/**
 * Seed Script Generator
 * 
 * This utility script helps create new seed files with proper naming
 * conventions and boilerplate code structure.
 * 
 * Usage:
 *   node scripts/create-seed.js "description-of-seed"
 * 
 * Example:
 *   node scripts/create-seed.js "seed-admin-users"
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
  console.log(`${color}[create-seed] ${message}${colors.reset}`);
}

// Get seed description from command line arguments
const args = process.argv.slice(2);
if (args.length === 0) {
  log('Error: No seed description provided', colors.red);
  log('Usage: node scripts/create-seed.js "description-of-seed"', colors.yellow);
  process.exit(1);
}

// Create seed name from description
const description = args[0].toLowerCase().trim().replace(/\s+/g, '-');

// Format the seed file name
let seedFileName = description;
if (!seedFileName.startsWith('seed-')) {
  seedFileName = `seed-${seedFileName}`;
}
if (!seedFileName.endsWith('.js')) {
  seedFileName = `${seedFileName}.js`;
}

const seedPath = path.join(__dirname, seedFileName);

// Seed file template
const seedTemplate = `/**
 * Seed: ${description}
 * Generated: ${new Date().toISOString()}
 * 
 * This script seeds the database with ${description.replace(/-/g, ' ')} data.
 */

const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Color codes for console output
const colors = {
  reset: '\\x1b[0m',
  bright: '\\x1b[1m',
  red: '\\x1b[31m',
  green: '\\x1b[32m',
  yellow: '\\x1b[33m',
  cyan: '\\x1b[36m'
};

// Helper function for logging
function log(message, color = colors.reset) {
  console.log(\`\${color}[${description}] \${message}\${colors.reset}\`);
}

// Database connection setup
async function createConnection() {
  // SSL configuration
  const sslConfig = {
    require: true,
    rejectUnauthorized: false
  };

  const config = {
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
      ssl: sslConfig,
      statement_timeout: 30000,
      query_timeout: 30000,
      idle_in_transaction_session_timeout: 30000
    }
  };

  let sequelize;
  
  try {
    if (process.env.DATABASE_URL) {
      log('Using DATABASE_URL for connection', colors.cyan);
      sequelize = new Sequelize(process.env.DATABASE_URL, config);
    } else {
      log('Using individual credentials for connection', colors.cyan);
      sequelize = new Sequelize(
        process.env.DB_NAME,
        process.env.DB_USER,
        process.env.DB_PASS,
        {
          ...config,
          host: process.env.DB_HOST,
          port: process.env.DB_PORT
        }
      );
    }

    await sequelize.authenticate();
    log('Database connection established successfully', colors.green);
    return sequelize;
  } catch (error) {
    log(\`Database connection failed: \${error.message}\`, colors.red);
    throw error;
  }
}

// Check if seed has already been applied
async function checkSeedStatus(sequelize, seedName) {
  try {
    const dbSchema = process.env.DB_SCHEMA || 'public';
    
    // Check if migrations table exists
    const [migrationTableResult] = await sequelize.query(\`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = '\${dbSchema}'
        AND table_name = 'migrations'
      );
    \`);
    
    if (!migrationTableResult[0].exists) {
      log('Migrations table does not exist yet', colors.yellow);
      return false;
    }
    
    // Check if this seed has been applied
    const [result] = await sequelize.query(\`
      SELECT EXISTS (
        SELECT FROM "\${dbSchema}"."migrations" 
        WHERE name = '\${seedName}'
      );
    \`);
    
    return result[0].exists;
  } catch (error) {
    log(\`Error checking seed status: \${error.message}\`, colors.red);
    return false;
  }
}

// Record that seed has been applied
async function recordSeed(sequelize, seedName) {
  try {
    const dbSchema = process.env.DB_SCHEMA || 'public';
    
    await sequelize.query(\`
      INSERT INTO "\${dbSchema}"."migrations" (name, applied_at)
      VALUES ('\${seedName}', NOW())
      ON CONFLICT (name) DO NOTHING;
    \`);
    
    log(\`Recorded seed '\${seedName}' in migrations table\`, colors.green);
  } catch (error) {
    log(\`Error recording seed: \${error.message}\`, colors.red);
    throw error;
  }
}

// Main seeding function
async function seedData(sequelize) {
  try {
    // Set schema
    const dbSchema = process.env.DB_SCHEMA || 'public';
    await sequelize.query(\`SET search_path TO "\${dbSchema}";\`);
    
    // TODO: Implement your seeding logic here
    // Example:
    /*
    await sequelize.query(\`
      INSERT INTO users (name, email, created_at, updated_at)
      VALUES 
        ('Admin User', 'admin@example.com', NOW(), NOW()),
        ('Test User', 'test@example.com', NOW(), NOW())
      ON CONFLICT (email) DO NOTHING;
    \`);
    */
    
    log('Seed data applied successfully', colors.green);
  } catch (error) {
    log(\`Error seeding data: \${error.message}\`, colors.red);
    throw error;
  }
}

// Main function
async function main() {
  let sequelize;
  
  try {
    // Create database connection
    sequelize = await createConnection();
    
    // Seed name for tracking in migrations table
    const seedName = '${description}';
    
    // Check if seed has already been applied
    const seedApplied = await checkSeedStatus(sequelize, seedName);
    if (seedApplied) {
      log(\`Seed '\${seedName}' has already been applied. Skipping...\`, colors.yellow);
      return;
    }
    
    // Apply seed data
    log(\`Applying seed '\${seedName}'...\`, colors.cyan);
    await seedData(sequelize);
    
    // Record that seed has been applied
    await recordSeed(sequelize, seedName);
    
    log('Seed completed successfully', colors.green);
  } catch (error) {
    log(\`Seed failed: \${error.message}\`, colors.red);
    process.exit(1);
  } finally {
    // Close database connection
    if (sequelize) {
      await sequelize.close();
      log('Database connection closed', colors.cyan);
    }
  }
}

// Run the main function
if (require.main === module) {
  main();
}

module.exports = {
  seedData,
  main
};
`;

// Create seed file
try {
  // Check if file already exists
  if (fs.existsSync(seedPath)) {
    log(`Error: Seed file ${seedFileName} already exists.`, colors.red);
    process.exit(1);
  }
  
  // Write seed file
  fs.writeFileSync(seedPath, seedTemplate);
  log(`Seed file created: ${seedFileName}`, colors.green);
  log(`Full path: ${seedPath}`, colors.cyan);
} catch (error) {
  log(`Error creating seed file: ${error.message}`, colors.red);
  process.exit(1);
} 