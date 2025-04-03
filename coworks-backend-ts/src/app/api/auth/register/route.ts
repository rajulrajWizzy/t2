// Explicitly set Node.js runtime for this route
export const runtime = "nodejs";

// Explicitly set Node.js runtime for this route

// src/app/api/auth/register/route.ts
// Explicitly set Node.js runtime for this route

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from 'next/server';
import sequelize from '@/config/database';
import models from '@/models';
import bcrypt from 'bcryptjs';
import { RegisterRequest, RegisterResponse } from '@/types/auth';
import { generateToken  } from '@/utils/jwt-wrapper';
import validation from '@/utils/validation';
import { ApiResponse } from '@/types/common';
import { QueryTypes } from 'sequelize';

// Add error interface
interface DatabaseError extends Error {
  code?: string;
  errno?: number;
  sqlState?: string;
  sqlMessage?: string;
}

// Add CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('[Customer Register] Processing registration request');
    
    // Check if this is a preflight request
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 200,
        headers: corsHeaders,
      });
    }
    
    // Read request body
    let body;
    try {
      body = await request.json() as RegisterRequest;
      console.log(`[Customer Register] Request body parsed successfully`);
    } catch (parseError) {
      console.error('[Customer Register] Failed to parse request body:', parseError);
      return NextResponse.json<ApiResponse<null>>(
        { success: false, message: 'Invalid request format', data: null },
        { status: 400, headers: corsHeaders });
    }
    
    const { 
      name, 
      email, 
      phone, 
      password, 
      profile_picture, 
      company_name,
      proof_of_identity,
      proof_of_address,
      address
    } = body;
    
    console.log(`[Customer Register] Processing registration for: ${email}`);
    
    // Basic validation
    if (!name || !email || !password) {
      console.log('[Customer Register] Missing required fields');
      return NextResponse.json<ApiResponse<null>>(
        { success: false, message: 'Name, email, and password are required', data: null },
        { status: 400, headers: corsHeaders });
    }
    
    // Company name validation - it cannot be null or empty
    if (!company_name) {
      console.log('[Customer Register] Missing company name');
      return NextResponse.json<ApiResponse<null>>(
        { success: false, message: 'Company name is required', data: null },
        { status: 400, headers: corsHeaders });
    }
    
    // Company name format validation
    if (!validation.isValidName(company_name)) {
      console.log('[Customer Register] Invalid company name format');
      return NextResponse.json<ApiResponse<null>>(
        { success: false, message: 'Company name cannot be empty or contain only whitespace', data: null },
        { status: 400, headers: corsHeaders });
    }
    
    // Name validation
    if (!validation.isValidName(name)) {
      console.log('[Customer Register] Invalid name format');
      return NextResponse.json<ApiResponse<null>>(
        { success: false, message: 'Name cannot be empty or contain only whitespace', data: null },
        { status: 400, headers: corsHeaders });
    }
    
    // Email validation
    if (!validation.isValidEmail(email)) {
      console.log('[Customer Register] Invalid email format');
      return NextResponse.json<ApiResponse<null>>(
        { 
          success: false, 
          message: 'Please provide a valid email address',
          data: null,
          error: 'Email must be in a valid format (e.g., user@example.com)'
        },
        { status: 400, headers: corsHeaders });
    }
    
    // Phone validation (if provided)
    if (phone && !validation.isValidPhone(phone)) {
      console.log('[Customer Register] Invalid phone format');
      return NextResponse.json<ApiResponse<null>>(
        { success: false, message: 'Phone number must be 10 digits', data: null },
        { status: 400, headers: corsHeaders });
    }
    
    // Password validation
    if (!validation.isValidPassword(password)) {
      console.log('[Customer Register] Invalid password format');
      return NextResponse.json<ApiResponse<null>>(
        { 
          success: false, 
          message: 'Password does not meet security requirements',
          data: null,
          error: validation.getPasswordRequirements()
        },
        { status: 400, headers: corsHeaders });
    }
    
    // Validate address if provided
    if (address && !validation.isValidAddress(address)) {
      console.log('[Customer Register] Invalid address format');
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Address cannot be empty or contain only whitespace',
        data: null
      }, { status: 400, headers: corsHeaders });
    }
    
    // Remove validation for proof of identity and address documents
    // These will be handled in the profile update process
    
    // Check if database and models are initialized
    if (!models.Customer || !sequelize) {
      console.error('[Customer Register] Database or models not initialized');
      return NextResponse.json<ApiResponse<null>>(
        { success: false, message: 'Database connection error', data: null },
        { status: 500, headers: corsHeaders });
    }
    
    try {
      console.log('[Customer Register] Checking if customers table exists');
      const dbSchema = process.env.DB_SCHEMA || 'excel_coworks_schema';
      
      // Check if the customers table exists
      const [tableExists] = await sequelize.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = '${dbSchema}' 
          AND table_name = 'customers'
        ) as exists;
      `, { type: QueryTypes.SELECT });
      
      // Use type assertion to access 'exists' property
      const customersTableExists = (tableExists as { exists: boolean })?.exists || false;
      console.log(`[Customer Register] Customers table exists: ${customersTableExists}`);
      
      if (!customersTableExists) {
        console.log('[Customer Register] Creating customers table...');
        
        // Create customers table if it doesn't exist
        await sequelize.query(`
          CREATE TABLE IF NOT EXISTS "${dbSchema}"."customers" (
            "id" SERIAL PRIMARY KEY,
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
            "verified_by" INTEGER,
            "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
          )
        `);
        
        console.log('[Customer Register] Customers table created successfully');
      }
    } catch (error) {
      console.error('[Customer Register] Error checking/creating table:', error);
      return NextResponse.json<ApiResponse<null>>(
        { success: false, message: 'Database initialization error', data: null },
        { status: 500, headers: corsHeaders });
    }
    
    // Check if email already exists
    try {
      console.log(`[Customer Register] Checking if email ${email} already exists`);
      const existingUser = await models.Customer.findOne({ where: { email } });
      
      if (existingUser) {
        console.log('[Customer Register] Email already registered');
        return NextResponse.json<ApiResponse<null>>(
          { success: false, message: 'Email already registered', data: null },
          { status: 409, headers: corsHeaders });
      }
    } catch (checkError) {
      console.error('[Customer Register] Error checking existing user:', checkError);
      return NextResponse.json<ApiResponse<null>>(
        { success: false, message: 'Error checking email availability', data: null },
        { status: 500, headers: corsHeaders });
    }
    
    // Hash password
    let hashedPassword;
    try {
      console.log('[Customer Register] Hashing password');
      const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(password, salt);
      
      // Verify the hash format
      if (!hashedPassword.startsWith('$2a$') && !hashedPassword.startsWith('$2b$')) {
        console.error('[Customer Register] Generated invalid password hash format');
        return NextResponse.json<ApiResponse<null>>(
          { success: false, message: 'Failed to secure password. Please try again.', data: null },
          { status: 500, headers: corsHeaders });
      }
      
      if (!hashedPassword || hashedPassword.length < 10) {
        console.error('[Customer Register] Failed to generate valid password hash');
        return NextResponse.json<ApiResponse<null>>(
          { success: false, message: 'Failed to secure password. Please try again.', data: null },
          { status: 500, headers: corsHeaders });
      }
    } catch (hashError) {
      console.error('[Customer Register] Password hashing error:', hashError);
      return NextResponse.json<ApiResponse<null>>(
        { success: false, message: 'Failed to secure password. Please try again.', data: null },
        { status: 500, headers: corsHeaders });
    }
    
    // Create new customer
    let customer;
    try {
      console.log('[Customer Register] Creating new customer');
      customer = await models.Customer.create({
        name,
        email,
        phone,
        password: hashedPassword,
        profile_picture: profile_picture || undefined,
        company_name: company_name || undefined,
        proof_of_identity: proof_of_identity || undefined,
        proof_of_address: proof_of_address || undefined,
        address: address || undefined,
        verification_status: 'PENDING',
        is_identity_verified: false,
        is_address_verified: false
      });
      
      if (!customer || !customer.id) {
        console.error('[Customer Register] Customer creation failed - no ID returned');
        return NextResponse.json<ApiResponse<null>>(
          { success: false, message: 'Failed to create account. Please try again.', data: null },
          { status: 500, headers: corsHeaders });
      }
      
      console.log('[Customer Register] Customer created successfully with ID:', customer.id);
      
      // Verify the password was saved correctly
      const savedCustomer = await models.Customer.findByPk(customer.id);
      if (!savedCustomer || !savedCustomer.password || 
          !savedCustomer.password.startsWith('$2a$') && !savedCustomer.password.startsWith('$2b$') ||
          savedCustomer.password.length < 10) {
        console.error('[Customer Register] Password not saved correctly');
        await customer.destroy(); // Rollback the registration
        return NextResponse.json<ApiResponse<null>>(
          { success: false, message: 'Failed to create account. Please try again.', data: null },
          { status: 500, headers: corsHeaders });
      }
    } catch (createError) {
      const error = createError as DatabaseError;
      console.error('[Customer Register] Customer creation error:', error);
      return NextResponse.json<ApiResponse<null>>(
        { success: false, message: 'Failed to create account. Please try again.', data: null, error: error.message },
        { status: 500, headers: corsHeaders });
    }
    
    // Return response without password
    const customerData = customer.get({ plain: true });
    const { password: _, ...customerWithoutPassword } = customerData;
    
    // Generate token for immediate use
    const token = generateToken(customer);
    
    console.log('[Customer Register] Registration completed successfully');
    
    return NextResponse.json<ApiResponse<RegisterResponse>>(
      {
        success: true,
        message: 'Registration successful',
        data: {
          message: 'Registration successful',
          customer: customerWithoutPassword as any,
          token
        }
      },
      { status: 201, headers: corsHeaders });
  } catch (error) {
    console.error('[Customer Register] Registration error:', error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, message: 'Registration failed', data: null, error: (error as Error).message },
      { status: 500, headers: corsHeaders });
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}
