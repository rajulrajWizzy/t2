/**
 * Fix Authentication Issues
 * This script adds fixes for the registration and login API routes
 */

const fs = require('fs');
const path = require('path');

console.log('===== Authentication Fix Script =====');

// Paths to the auth route files
const registerPath = path.join('src', 'app', 'api', 'auth', 'register', 'route.ts');
const loginPath = path.join('src', 'app', 'api', 'auth', 'login', 'route.ts');

// Fix for register route
function fixRegisterRoute() {
  console.log(`Checking ${registerPath}...`);
  
  if (!fs.existsSync(registerPath)) {
    console.error(`❌ Register route file not found at ${registerPath}`);
    return false;
  }
  
  let content = fs.readFileSync(registerPath, 'utf8');
  
  // Fix the undefined customerData issue
  const fixedContent = content.replace(
    // Find the section where customerData.password is being destructured
    /const\s*{\s*password\s*}\s*=\s*customerData\s*;/g,
    // Replace with proper null check
    `const password = customerData?.password;\n    if (!password) {\n      console.error('[Customer Register] Password is undefined');\n      return NextResponse.json({ success: false, message: 'Registration failed', data: null, error: 'Password is required' }, { status: 400, headers: corsHeaders });\n    }`
  );
  
  // Write the changes back to the file
  if (content !== fixedContent) {
    fs.writeFileSync(registerPath, fixedContent, 'utf8');
    console.log(`✅ Updated register route with null checks for customer data`);
    return true;
  } else {
    console.log(`ℹ️ No changes needed for register route`);
    return false;
  }
}

// Fix for login route
function fixLoginRoute() {
  console.log(`Checking ${loginPath}...`);
  
  if (!fs.existsSync(loginPath)) {
    console.error(`❌ Login route file not found at ${loginPath}`);
    return false;
  }
  
  let content = fs.readFileSync(loginPath, 'utf8');
  
  // Update the token generation and validation
  let fixedContent = content.replace(
    // Find token generation code
    /const token = generateToken\({[\s\S]*?\});/g,
    // Replace with more robust token generation
    `const token = generateToken({\n        id: user.id,\n        email: user.email,\n        name: user.name || '',\n        timestamp: new Date().getTime()\n      });\n      // Log token generation\n      console.log(\`[Customer Login] Generated token for user \${user.id}\`);`
  );
  
  // Add debugging for token validation
  fixedContent = fixedContent.replace(
    // Find the JWT verify error handler
    /catch \(jwtError\) {[\s\S]*?console\.error\(['"].*?['"]/g,
    // Replace with better error logging
    `catch (jwtError) {\n      console.error('[Auth] JWT verification failed:', jwtError)`
  );
  
  // Write the changes back to the file
  if (content !== fixedContent) {
    fs.writeFileSync(loginPath, fixedContent, 'utf8');
    console.log(`✅ Updated login route with improved token handling`);
    return true;
  } else {
    console.log(`ℹ️ No changes needed for login route`);
    return false;
  }
}

// Fix JWT wrapper utility
function fixJwtUtility() {
  const jwtWrapperPath = path.join('src', 'utils', 'jwt-wrapper.ts');
  console.log(`Checking ${jwtWrapperPath}...`);
  
  if (!fs.existsSync(jwtWrapperPath)) {
    console.error(`❌ JWT wrapper file not found at ${jwtWrapperPath}`);
    return false;
  }
  
  let content = fs.readFileSync(jwtWrapperPath, 'utf8');
  
  // Fix token generation and verification
  let fixedContent = content.replace(
    // Find the generateToken function
    /export const generateToken = \(payload: any\)[\s\S]*?{[\s\S]*?return jwt\.sign\([\s\S]*?\);[\s\S]*?}/g,
    // Replace with more robust implementation
    `export const generateToken = (payload: any) => {
  try {
    // Ensure payload has the required fields
    if (!payload || !payload.id || !payload.email) {
      console.error('[JWT] Missing required fields in payload');
      throw new Error('Invalid payload for token generation');
    }
    
    // Add timestamps if not present
    const enhancedPayload = {
      ...payload,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    };
    
    // Generate the token
    console.log('[JWT] Generating token with payload:', JSON.stringify(enhancedPayload));
    return jwt.sign(enhancedPayload, JWT_SECRET);
  } catch (error) {
    console.error('[JWT] Token generation error:', error);
    throw error;
  }
}`
  );
  
  // Fix verifyJWT function
  fixedContent = fixedContent.replace(
    // Find the verifyJWT function
    /export const verifyJWT = \(token: string\)[\s\S]*?{[\s\S]*?return jwt\.verify\([\s\S]*?\);[\s\S]*?}/g,
    // Replace with more robust implementation
    `export const verifyJWT = (token: string) => {
  try {
    if (!token) {
      console.error('[JWT] No token provided for verification');
      throw new Error('No token provided');
    }
    
    // Clean the token (remove Bearer prefix if present)
    const cleanToken = token.startsWith('Bearer ') ? token.slice(7).trim() : token.trim();
    
    if (!cleanToken) {
      console.error('[JWT] Empty token after cleaning');
      throw new Error('Empty token');
    }
    
    console.log('[JWT] Verifying token');
    const decoded = jwt.verify(cleanToken, JWT_SECRET);
    console.log('[JWT] Token verified successfully');
    return decoded;
  } catch (error) {
    console.error('[JWT] Token verification error:', error);
    throw error;
  }
}`
  );
  
  // Write the changes back to the file
  if (content !== fixedContent) {
    fs.writeFileSync(jwtWrapperPath, fixedContent, 'utf8');
    console.log(`✅ Updated JWT wrapper with improved token handling`);
    return true;
  } else {
    console.log(`ℹ️ No changes needed for JWT wrapper`);
    return false;
  }
}

// Create a customers table to ensure it exists
async function ensureCustomersTable() {
  console.log('Creating a script to ensure customers table exists...');
  
  const scriptPath = 'ensure-customers-table.js';
  const scriptContent = `/**
 * Ensure Customers Table Exists
 * This script creates the customers table if it doesn't exist
 */

const { Sequelize } = require('sequelize');

// Database connection settings
const database = process.env.DB_NAME || 'excel_coworks';
const username = process.env.DB_USER || 'postgres';
const password = process.env.DB_PASS || 'postgres';
const host = process.env.DB_HOST || 'localhost';
const port = process.env.DB_PORT || 5432;
const schema = process.env.DB_SCHEMA || 'excel_coworks_schema';

console.log('='.repeat(50));
console.log('ENSURE CUSTOMERS TABLE EXISTS');
console.log('='.repeat(50));
console.log(\`Database: \${database}\`);
console.log(\`Schema: \${schema}\`);
console.log('-'.repeat(50));

// Create Sequelize instance
const sequelize = new Sequelize(database, username, password, {
  host: host,
  port: port,
  dialect: 'postgres',
  logging: console.log,
});

// Function to ensure customers table exists
async function ensureCustomersTable() {
  try {
    // Test the database connection
    console.log('Testing database connection...');
    await sequelize.authenticate();
    console.log('✅ Connection established successfully.');

    // Check if the customers table exists
    console.log('Checking if customers table exists...');
    const [tableExists] = await sequelize.query(\`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = '\${schema}' 
        AND table_name = 'customers'
      ) as exists;
    \`);
    
    const exists = tableExists[0]?.exists || false;
    
    if (exists) {
      console.log('✅ Customers table already exists.');
    } else {
      console.log('Creating customers table...');
      
      // Create customers table
      await sequelize.query(\`
        CREATE TABLE IF NOT EXISTS "\${schema}"."customers" (
          "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          "name" VARCHAR(100) NOT NULL,
          "email" VARCHAR(100) NOT NULL UNIQUE,
          "phone" VARCHAR(20),
          "password" VARCHAR(255) NOT NULL,
          "profile_picture" VARCHAR(255),
          "company_name" VARCHAR(100),
          "proof_of_identity" VARCHAR(255),
          "proof_of_address" VARCHAR(255),
          "address" TEXT,
          "is_identity_verified" BOOLEAN NOT NULL DEFAULT FALSE,
          "is_address_verified" BOOLEAN NOT NULL DEFAULT FALSE,
          "verification_status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
          "verification_notes" TEXT,
          "verification_date" TIMESTAMP WITH TIME ZONE,
          "verified_by" UUID,
          "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      \`);
      
      console.log('✅ Customers table created successfully.');
      
      // Insert a sample customer for testing
      console.log('Creating sample customer for testing...');
      const hashedPassword = 'hashed_password_here'; // In production, use bcrypt
      
      await sequelize.query(\`
        INSERT INTO "\${schema}"."customers" 
        (name, email, phone, password, company_name, verification_status) 
        VALUES 
        ('Test User', 'test@example.com', '1234567890', '\${hashedPassword}', 'Test Company', 'APPROVED')
        ON CONFLICT DO NOTHING
      \`);
      
      console.log('✅ Sample customer created successfully.');
    }
    
    console.log('-'.repeat(50));
    console.log('✅ Process completed successfully.');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the function
ensureCustomersTable();
`;
  
  fs.writeFileSync(scriptPath, scriptContent, 'utf8');
  console.log(`✅ Created script to ensure customers table exists at ${scriptPath}`);
  return true;
}

// Run the fixes
function runFixes() {
  let changesCount = 0;
  
  // Register route fix
  if (fixRegisterRoute()) changesCount++;
  
  // Login route fix
  if (fixLoginRoute()) changesCount++;
  
  // JWT wrapper fix
  if (fixJwtUtility()) changesCount++;
  
  // Ensure customers table exists
  if (ensureCustomersTable()) changesCount++;
  
  if (changesCount > 0) {
    console.log(`\n✅ Fixed ${changesCount} auth-related issues.`);
    console.log('\nTo apply these changes:');
    console.log('1. Restart your application with: pm2 restart all');
    console.log('2. Run the customers table script: node ensure-customers-table.js');
    console.log('3. Test registration and login endpoints');
  } else {
    console.log('\n❓ No issues detected or files not found. Manual inspection may be needed.');
  }
}

// Execute
runFixes(); 