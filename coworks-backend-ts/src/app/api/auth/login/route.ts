// Explicitly set Node.js runtime for this route
export const runtime = "nodejs";

// Explicitly set Node.js runtime for this route

// Use Node.js runtime for Sequelize compatibility

// Explicitly set Node.js runtime for this route

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from 'next/server';
import models from '@/models';
import bcrypt from 'bcryptjs';
import { generateToken  } from '@/utils/jwt-wrapper';
import { LoginRequest, LoginResponse } from '@/types/auth';
import validation from '@/utils/validation';
import { ApiResponse } from '@/types/common';

// Add CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Add error type definitions
interface DatabaseError extends Error {
  code?: string;
  errno?: number;
  sqlState?: string;
  sqlMessage?: string;
}

interface PasswordError extends Error {
  code?: string;
  errno?: number;
}

interface TokenError extends Error {
  code?: string;
  errno?: number;
}

interface UpdateError extends Error {
  code?: string;
  errno?: number;
}

interface ResponseError extends Error {
  code?: string;
  errno?: number;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('[Customer Login] Processing request');
    
    // Check if this is a preflight request
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 204,
        headers: corsHeaders,
      });
    }
    
    // Read request body
    let body;
    try {
      body = await request.json() as LoginRequest;
      console.log(`[Customer Login] Request body parsed successfully`);
    } catch (parseError) {
      console.error('[Customer Login] Failed to parse request body:', parseError);
      return NextResponse.json<ApiResponse<null>>(
        { success: false, message: 'Invalid request format', data: null },
        { status: 400, headers: corsHeaders }
      );
    }
    
    const { email, password } = body;
    
    console.log(`[Customer Login] Attempt for email: ${email}`);
    
    // Basic validation
    if (!email || !password) {
      console.log('[Customer Login] Missing email or password');
      return NextResponse.json<ApiResponse<null>>(
        { success: false, message: 'Email and password are required', data: null },
        { status: 400, headers: corsHeaders }
      );
    }
    
    // Email format validation
    if (!validation.isValidEmail(email)) {
      console.log('[Customer Login] Invalid email format');
      return NextResponse.json<ApiResponse<null>>(
        { 
          success: false, 
          message: 'Invalid email format',
          data: null,
          error: 'Email must be in a valid format (e.g., user@example.com)'
        },
        { status: 400, headers: corsHeaders }
      );
    }
    
    // Check if Customer model exists
    if (!models.Customer) {
      console.error('[Customer Login] Customer model not initialized');
      return NextResponse.json<ApiResponse<null>>(
        { success: false, message: 'Customer database not initialized', data: null },
        { status: 500, headers: corsHeaders }
      );
    }
    
    // Find customer by email
    let customer;
    try {
      customer = await models.Customer.findOne({ 
        where: { email },
        attributes: ['id', 'email', 'password', 'name', 'is_identity_verified', 'verification_status', 'phone', 'company_name', 'profile_picture']
      });
      
      if (!customer) {
        console.log(`[Customer Login] No customer found with email: ${email}`);
        return NextResponse.json<ApiResponse<null>>(
          { success: false, message: 'Invalid email or password', data: null },
          { status: 401, headers: corsHeaders }
        );
      }
      
      console.log(`[Customer Login] Customer found with ID: ${customer.id}`);
      
      // Verify customer data integrity
      if (!customer.id || !customer.email) {
        console.error('[Customer Login] Customer data is invalid:', { id: customer.id, email: customer.email });
        return NextResponse.json<ApiResponse<null>>(
          { success: false, message: 'Account data is invalid. Please contact support.', data: null },
          { status: 500, headers: corsHeaders }
        );
      }
    } catch (dbError) {
      const error = dbError as DatabaseError;
      console.error('[Customer Login] Database error:', error);
      return NextResponse.json<ApiResponse<null>>(
        { success: false, message: 'Database error, please try again later', data: null, error: error.message },
        { status: 500, headers: corsHeaders }
      );
    }
    
    // Compare passwords
    try {
      console.log('[Customer Login] Comparing passwords');
      const storedPassword = customer.password;
      
      if (!storedPassword) {
        console.error('[Customer Login] Stored password is missing or invalid');
        return NextResponse.json<ApiResponse<null>>(
          { 
            success: false, 
            message: 'Account has invalid credentials. Please use password reset.',
            data: null,
            error: 'password_missing'
          },
          { status: 401, headers: corsHeaders }
        );
      }
      
      // Verify password format
      if (!storedPassword.startsWith('$2a$') && !storedPassword.startsWith('$2b$')) {
        console.error('[Customer Login] Invalid password hash format');
        return NextResponse.json<ApiResponse<null>>(
          { 
            success: false, 
            message: 'Account has invalid credentials. Please use password reset.',
            data: null,
            error: 'invalid_hash_format'
          },
          { status: 401, headers: corsHeaders }
        );
      }
      
      const isPasswordValid = await bcrypt.compare(password, storedPassword);
      console.log(`[Customer Login] Password validation: ${isPasswordValid ? 'Valid' : 'Invalid'}`);
      
      if (!isPasswordValid) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, message: 'Invalid email or password', data: null },
          { status: 401, headers: corsHeaders }
        );
      }
    } catch (passwordError) {
      const error = passwordError as PasswordError;
      console.error('[Customer Login] Password comparison error:', error);
      
      return NextResponse.json<ApiResponse<null>>(
        { success: false, message: 'Authentication error', data: null, error: error.message },
        { status: 500, headers: corsHeaders }
      );
    }
    
    // Update customer's last login timestamp
    try {
      // Use a direct SQL query to update the last_login field
      await models.sequelize?.query(`
        UPDATE "${process.env.DB_SCHEMA || 'excel_coworks_schema'}"."customers"
        SET last_login = CURRENT_TIMESTAMP
        WHERE id = :id
      `, {
        replacements: { id: customer.id }
      });
    } catch (updateError) {
      // Non-critical error, just log it
      console.error('[Customer Login] Failed to update last login timestamp:', updateError);
    }
    
    // Generate JWT token
    let token;
    try {
      // Use the proper import from config/jwt
      token = generateToken(customer);
      if (!token) {
        throw new Error('Failed to generate authentication token');
      }
      console.log('[Customer Login] Token generated successfully');
    } catch (tokenError) {
      const error = tokenError as TokenError;
      console.error('[Customer Login] Token generation error:', error);
      return NextResponse.json<ApiResponse<null>>(
        { success: false, message: 'Failed to authenticate', data: null, error: error.message },
        { status: 500, headers: corsHeaders }
      );
    }
    
    // Prepare response data (excluding password)
    const customerData = customer.get({ plain: true });
    // Use a type-safe way to remove the password
    const { password: _, ...customerWithoutPassword } = customerData;
    
    // Return success response
    return NextResponse.json<ApiResponse<LoginResponse>>(
      {
        success: true,
        message: 'Login successful',
        data: {
          message: 'Login successful',
          token,
          customer: customerWithoutPassword
        }
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (responseError) {
    const error = responseError as ResponseError;
    console.error('[Customer Login] Unexpected error:', error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, message: 'An unexpected error occurred', data: null, error: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders
  });
}


