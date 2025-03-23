const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

console.log('Starting test user creation script...');

// Configuration
const JWT_SECRET = 'your-secret-key'; // Same as default in application
const SALT_ROUNDS = 10;
const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const USER_FILE = path.join(DATA_DIR, 'users.json');
const ADMIN_FILE = path.join(DATA_DIR, 'admins.json');

// Create data directory if it doesn't exist
if (!fs.existsSync(DATA_DIR)) {
  console.log(`Creating data directory: ${DATA_DIR}`);
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Admin roles
const AdminRole = {
  SUPER_ADMIN: 'super_admin',
  BRANCH_ADMIN: 'branch_admin',
  SUPPORT_ADMIN: 'support_admin'
};

// Test users to create
const testUsers = [
  {
    name: 'Regular User',
    email: 'user@example.com',
    password: 'User123!',
    phone: '123-456-7890',
    is_verified: true,
    is_active: true,
    role: 'user'
  }
];

// Test admins to create
const testAdmins = [
  {
    name: 'Super Admin',
    email: 'superadmin@coworks.com',
    password: 'SuperAdmin123!',
    role: AdminRole.SUPER_ADMIN,
    is_active: true,
    branch_id: null
  },
  {
    name: 'Branch Admin',
    email: 'branchadmin@coworks.com',
    password: 'BranchAdmin123!',
    role: AdminRole.BRANCH_ADMIN,
    is_active: true,
    branch_id: 1
  }
];

/**
 * Hash a password using bcrypt
 * @param {string} password 
 * @returns {Promise<string>}
 */
async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Create test users and save to file
 */
async function createTestUsers() {
  // Prepare users with hashed passwords
  const users = [];
  
  for (const user of testUsers) {
    const hashedPassword = await hashPassword(user.password);
    
    users.push({
      id: users.length + 1,
      name: user.name,
      email: user.email,
      password: hashedPassword,
      phone: user.phone,
      is_verified: user.is_verified,
      is_active: user.is_active,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  }
  
  // Save users to file
  fs.writeFileSync(USER_FILE, JSON.stringify(users, null, 2));
  console.log(`Created ${users.length} test users and saved to ${USER_FILE}`);
  
  return users;
}

/**
 * Create test admins and save to file
 */
async function createTestAdmins() {
  // Prepare admins with hashed passwords
  const admins = [];
  
  for (const admin of testAdmins) {
    const hashedPassword = await hashPassword(admin.password);
    
    admins.push({
      id: admins.length + 1,
      name: admin.name,
      email: admin.email,
      password: hashedPassword,
      role: admin.role,
      is_active: admin.is_active,
      branch_id: admin.branch_id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  }
  
  // Save admins to file
  fs.writeFileSync(ADMIN_FILE, JSON.stringify(admins, null, 2));
  console.log(`Created ${admins.length} test admins and saved to ${ADMIN_FILE}`);
  
  return admins;
}

/**
 * Create a .env file with JWT secret if it doesn't exist
 */
function ensureEnvFile() {
  const envPath = path.join(__dirname, '..', '..', '.env');
  
  // Check if .env file exists, if not create it
  if (!fs.existsSync(envPath)) {
    console.log('Creating .env file with JWT_SECRET');
    fs.writeFileSync(envPath, `JWT_SECRET=${JWT_SECRET}\n`);
  } else {
    // Check if JWT_SECRET is in the .env file
    const envContent = fs.readFileSync(envPath, 'utf8');
    if (!envContent.includes('JWT_SECRET=')) {
      console.log('Adding JWT_SECRET to existing .env file');
      fs.appendFileSync(envPath, `\nJWT_SECRET=${JWT_SECRET}\n`);
    }
  }
}

/**
 * Create test tokens for direct API testing
 */
function generateTestTokens(users, admins) {
  const tokens = {
    user: generateUserToken(users[0]),
    branch_admin: generateAdminToken(admins.find(a => a.role === AdminRole.BRANCH_ADMIN)),
    super_admin: generateAdminToken(admins.find(a => a.role === AdminRole.SUPER_ADMIN))
  };
  
  // Save tokens to file for easy reference
  fs.writeFileSync(path.join(DATA_DIR, 'test-tokens.json'), JSON.stringify(tokens, null, 2));
  console.log(`Generated test tokens and saved to ${path.join(DATA_DIR, 'test-tokens.json')}`);
  
  // Also print to console for immediate use
  console.log('\nTest Tokens for API Testing:');
  console.log('===========================');
  console.log(`User Token: ${tokens.user}`);
  console.log(`Branch Admin Token: ${tokens.branch_admin}`);
  console.log(`Super Admin Token: ${tokens.super_admin}`);
}

/**
 * Generate a JWT token for a user
 * @param {Object} user 
 * @returns {string}
 */
function generateUserToken(user) {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };
  
  const payload = {
    id: user.id,
    email: user.email,
    name: user.name,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
  };
  
  return signJwt(header, payload);
}

/**
 * Generate a JWT token for an admin
 * @param {Object} admin 
 * @returns {string}
 */
function generateAdminToken(admin) {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };
  
  const payload = {
    id: admin.id,
    email: admin.email,
    name: admin.name,
    role: admin.role,
    branch_id: admin.branch_id,
    is_admin: true,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
  };
  
  return signJwt(header, payload);
}

/**
 * Sign a JWT token
 * @param {Object} header 
 * @param {Object} payload 
 * @returns {string}
 */
function signJwt(header, payload) {
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64').replace(/=+$/, '');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64').replace(/=+$/, '');
  
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64')
    .replace(/=+$/, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * Fix auth issues by ensuring JWT environment is set up
 */
function fixAuthIssues() {
  // Create dev folders that might be needed
  ['tmp', 'data', 'logs'].forEach(dir => {
    const dirPath = path.join(__dirname, '..', '..', dir);
    if (!fs.existsSync(dirPath)) {
      console.log(`Creating directory: ${dirPath}`);
      fs.mkdirSync(dirPath, { recursive: true });
    }
  });
  
  // Ensure .env file is set up with JWT secrets
  ensureEnvFile();
  
  console.log('Auth issues fixed! JWT environment has been configured.');
}

// Run all the setup functions
async function runSetup() {
  try {
    console.log('Starting setup process...');
    
    // First fix any auth issues
    fixAuthIssues();
    
    // Create test users and admins
    const users = await createTestUsers();
    const admins = await createTestAdmins();
    
    // Generate test tokens
    generateTestTokens(users, admins);
    
    console.log('\nSetup completed successfully!');
    console.log('You can now use the test accounts to authenticate:');
    console.log('1. Regular User:');
    console.log('   Email: user@example.com');
    console.log('   Password: User123!');
    console.log('2. Branch Admin:');
    console.log('   Email: branchadmin@coworks.com');
    console.log('   Password: BranchAdmin123!');
    console.log('3. Super Admin:');
    console.log('   Email: superadmin@coworks.com');
    console.log('   Password: SuperAdmin123!');
    
    console.log('\nOr use the pre-generated tokens from the data/test-tokens.json file');
    console.log('for direct API testing with Postman or other tools.');
  } catch (error) {
    console.error('Error during setup:', error);
    process.exit(1);
  }
}

// Run the setup
runSetup(); 