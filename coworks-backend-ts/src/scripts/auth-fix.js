const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

console.log('📝 Starting CoWorks API authorization fix...');

// Configuration
const JWT_SECRET = 'your-secret-key';
const TOKENS_DIR = path.join(__dirname, '..', '..', 'tokens');
const TOKEN_FILE = path.join(TOKENS_DIR, 'access-tokens.json');

// Create tokens directory if it doesn't exist
if (!fs.existsSync(TOKENS_DIR)) {
  console.log(`Creating tokens directory: ${TOKENS_DIR}`);
  fs.mkdirSync(TOKENS_DIR, { recursive: true });
}

// Sample user data for testing
const users = [
  {
    id: 1,
    name: 'Regular User',
    email: 'user@example.com',
    role: 'user',
    branch_id: null
  },
  {
    id: 2,
    name: 'Branch Admin',
    email: 'branchadmin@coworks.com',
    role: 'branch_admin',
    branch_id: 1,
    is_admin: true,
    permissions: {
      seats: ['read', 'create', 'update', 'delete'],
      bookings: ['read', 'create', 'update', 'delete'],
      users: ['read']
    }
  },
  {
    id: 3,
    name: 'Super Admin',
    email: 'superadmin@coworks.com',
    role: 'super_admin',
    branch_id: null,
    is_admin: true
  }
];

/**
 * Fix JWT environment setup
 */
function fixJwtEnvironment() {
  const envPath = path.join(__dirname, '..', '..', '.env');
  
  // Read .env file if it exists
  let envContent = '';
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }
  
  // Check if JWT_SECRET is already in .env
  if (!envContent.includes('JWT_SECRET=')) {
    console.log('Adding JWT_SECRET to .env file');
    const newEnvContent = `JWT_SECRET=${JWT_SECRET}\n${envContent}`;
    fs.writeFileSync(envPath, newEnvContent);
    console.log('✅ JWT_SECRET added to .env file');
  } else {
    // Replace existing JWT_SECRET with our value
    console.log('Updating JWT_SECRET in .env file');
    const updatedEnvContent = envContent.replace(
      /JWT_SECRET=.*(\r?\n|$)/,
      `JWT_SECRET=${JWT_SECRET}\n`
    );
    fs.writeFileSync(envPath, updatedEnvContent);
    console.log('✅ JWT_SECRET updated in .env file');
  }
}

/**
 * Generate tokens for all test users
 */
function generateTokens() {
  const tokens = {};
  
  for (const user of users) {
    const payload = {
      id: user.id,
      email: user.email,
      name: user.name
    };
    
    // Add specific fields based on user type
    if (user.role) {
      payload.role = user.role;
    }
    
    if (user.branch_id !== undefined) {
      payload.branch_id = user.branch_id;
    }
    
    if (user.is_admin) {
      payload.is_admin = true;
    }
    
    if (user.permissions) {
      payload.permissions = user.permissions;
    }
    
    // Generate token with 24-hour expiry
    const token = jwt.sign(
      payload,
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    // Add token to collection
    tokens[user.role] = {
      user: payload,
      token
    };
  }
  
  // Save tokens to file
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2));
  console.log(`✅ Generated tokens saved to ${TOKEN_FILE}`);
  
  // Also print token values for immediate use
  console.log('\n🔑 Access Tokens for API Testing:');
  console.log('===============================');
  
  for (const [role, data] of Object.entries(tokens)) {
    console.log(`\n${role.toUpperCase()} TOKEN:`);
    console.log(data.token);
  }
}

/**
 * Create a sample curl commands file
 */
function createCurlCommands() {
  const tokens = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
  const curlFile = path.join(TOKENS_DIR, 'api-commands.txt');
  
  let curlCommands = '# CoWorks API Test Commands\n\n';
  
  // Regular user commands
  curlCommands += '## Regular User API Commands\n\n';
  curlCommands += `export USER_TOKEN="${tokens.user.token}"\n\n`;
  curlCommands += '# Get user profile\n';
  curlCommands += 'curl -X GET "http://localhost:3000/api/profile" -H "Authorization: Bearer $USER_TOKEN"\n\n';
  curlCommands += '# Create booking\n';
  curlCommands += 'curl -X POST "http://localhost:3000/api/bookings" \\\n';
  curlCommands += '  -H "Authorization: Bearer $USER_TOKEN" \\\n';
  curlCommands += '  -H "Content-Type: application/json" \\\n';
  curlCommands += '  -d \'{"branch_id": 1, "seating_type_id": 1, "date": "2023-10-15", "start_time": "09:00", "end_time": "17:00"}\'\n\n';
  
  // Branch admin commands
  curlCommands += '## Branch Admin API Commands\n\n';
  curlCommands += `export BRANCH_ADMIN_TOKEN="${tokens.branch_admin.token}"\n\n`;
  curlCommands += '# Get admin profile\n';
  curlCommands += 'curl -X GET "http://localhost:3000/api/admin/profile" -H "Authorization: Bearer $BRANCH_ADMIN_TOKEN"\n\n';
  curlCommands += '# List users\n';
  curlCommands += 'curl -X GET "http://localhost:3000/api/admin/users" -H "Authorization: Bearer $BRANCH_ADMIN_TOKEN"\n\n';
  
  // Super admin commands
  curlCommands += '## Super Admin API Commands\n\n';
  curlCommands += `export SUPER_ADMIN_TOKEN="${tokens.super_admin.token}"\n\n`;
  curlCommands += '# Get super admin dashboard stats\n';
  curlCommands += 'curl -X GET "http://localhost:3000/api/admin/super/stats" -H "Authorization: Bearer $SUPER_ADMIN_TOKEN"\n\n';
  curlCommands += '# Create admin user\n';
  curlCommands += 'curl -X POST "http://localhost:3000/api/admin/users/create" \\\n';
  curlCommands += '  -H "Authorization: Bearer $SUPER_ADMIN_TOKEN" \\\n';
  curlCommands += '  -H "Content-Type: application/json" \\\n';
  curlCommands += '  -d \'{"name": "New Admin", "email": "newadmin@example.com", "password": "SecurePass123", "role": "branch_admin", "branchId": 1}\'\n\n';
  
  // Save to file
  fs.writeFileSync(curlFile, curlCommands);
  console.log(`✅ CURL commands saved to ${curlFile}`);
}

/**
 * Create a Postman collection file
 */
function createPostmanCollection() {
  const tokens = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
  const postmanFile = path.join(TOKENS_DIR, 'coworks-api.postman_collection.json');
  
  const collection = {
    info: {
      name: 'CoWorks API Collection',
      description: 'API collection for CoWorks backend',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
    },
    variable: [
      {
        key: 'baseUrl',
        value: 'http://localhost:3000',
        type: 'string'
      }
    ],
    item: [
      {
        name: 'Authentication',
        item: [
          {
            name: 'User Login',
            request: {
              method: 'POST',
              url: '{{baseUrl}}/api/auth/login',
              header: [
                {
                  key: 'Content-Type',
                  value: 'application/json'
                }
              ],
              body: {
                mode: 'raw',
                raw: JSON.stringify({
                  email: 'user@example.com',
                  password: 'User123!'
                }, null, 2)
              }
            }
          },
          {
            name: 'Admin Login',
            request: {
              method: 'POST',
              url: '{{baseUrl}}/api/admin/auth/login',
              header: [
                {
                  key: 'Content-Type',
                  value: 'application/json'
                }
              ],
              body: {
                mode: 'raw',
                raw: JSON.stringify({
                  email: 'superadmin@coworks.com',
                  password: 'SuperAdmin123!'
                }, null, 2)
              }
            }
          }
        ]
      },
      {
        name: 'User API',
        item: [
          {
            name: 'Get Profile',
            request: {
              method: 'GET',
              url: '{{baseUrl}}/api/profile',
              header: [
                {
                  key: 'Authorization',
                  value: `Bearer ${tokens.user.token}`
                }
              ]
            }
          },
          {
            name: 'Get Bookings',
            request: {
              method: 'GET',
              url: '{{baseUrl}}/api/bookings',
              header: [
                {
                  key: 'Authorization',
                  value: `Bearer ${tokens.user.token}`
                }
              ]
            }
          }
        ]
      },
      {
        name: 'Admin API',
        item: [
          {
            name: 'Get Admin Profile',
            request: {
              method: 'GET',
              url: '{{baseUrl}}/api/admin/profile',
              header: [
                {
                  key: 'Authorization',
                  value: `Bearer ${tokens.branch_admin.token}`
                }
              ]
            }
          },
          {
            name: 'List Users',
            request: {
              method: 'GET',
              url: '{{baseUrl}}/api/admin/users',
              header: [
                {
                  key: 'Authorization',
                  value: `Bearer ${tokens.branch_admin.token}`
                }
              ]
            }
          }
        ]
      },
      {
        name: 'Super Admin API',
        item: [
          {
            name: 'Get Super Admin Stats',
            request: {
              method: 'GET',
              url: '{{baseUrl}}/api/admin/super/stats',
              header: [
                {
                  key: 'Authorization',
                  value: `Bearer ${tokens.super_admin.token}`
                }
              ]
            }
          },
          {
            name: 'Create Admin User',
            request: {
              method: 'POST',
              url: '{{baseUrl}}/api/admin/users/create',
              header: [
                {
                  key: 'Authorization',
                  value: `Bearer ${tokens.super_admin.token}`
                },
                {
                  key: 'Content-Type',
                  value: 'application/json'
                }
              ],
              body: {
                mode: 'raw',
                raw: JSON.stringify({
                  name: 'New Admin',
                  email: 'newadmin@example.com',
                  password: 'SecurePass123',
                  role: 'branch_admin',
                  branchId: 1
                }, null, 2)
              }
            }
          }
        ]
      }
    ]
  };
  
  // Save to file
  fs.writeFileSync(postmanFile, JSON.stringify(collection, null, 2));
  console.log(`✅ Postman collection saved to ${postmanFile}`);
}

// Run the functions
try {
  fixJwtEnvironment();
  generateTokens();
  createCurlCommands();
  createPostmanCollection();
  
  console.log('\n🎉 Authorization fix completed successfully!');
  console.log('\nInstructions:');
  console.log('1. Use the tokens from tokens/access-tokens.json in your API requests');
  console.log('2. Import the Postman collection from tokens/coworks-api.postman_collection.json');
  console.log('3. For curl commands, see tokens/api-commands.txt');
  console.log('\nTest credentials:');
  console.log('- Regular User: user@example.com / User123!');
  console.log('- Branch Admin: branchadmin@coworks.com / BranchAdmin123!');
  console.log('- Super Admin: superadmin@coworks.com / SuperAdmin123!');
} catch (error) {
  console.error('❌ Error fixing authorization:', error);
} 