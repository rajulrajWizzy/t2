// src/app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import models from '@/models';
import bcrypt from 'bcryptjs';
import { RegisterRequest, RegisterResponse } from '@/types/auth';
import { generateToken } from '@/utils/jwt';
import validation from '@/utils/validation';
import mailService from '@/utils/mailService';
import { ApiResponse } from '@/types/common';

// CORS headers for API
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/**
 * Register a new user
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    if (request.method === 'OPTIONS') {
      return handleOptionsRequest();
    }

    const body = await request.json();
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
    
    // Basic validation
    if (!name || !email || !password) {
      return NextResponse.json({
        success: false,
        message: 'Name, email, and password are required',
        data: null
      }, { status: 400, headers: corsHeaders });
    }

    // Company name validation - it cannot be null or empty
    if (!company_name) {
      return NextResponse.json({
        success: false,
        message: 'Company name is required',
        data: null
      }, { status: 400, headers: corsHeaders });
    }
    
    // Validate other fields with the validation utility
    if (!validation.isValidName(name)) {
      return NextResponse.json({
        success: false,
        message: 'Name cannot be empty or contain only whitespace',
        data: null
      }, { status: 400, headers: corsHeaders });
    }
    
    if (!validation.isValidEmail(email)) {
      return NextResponse.json({
        success: false,
        message: 'Please provide a valid email address',
        details: 'Email must be in a valid format (e.g., user@example.com)',
        data: null
      }, { status: 400, headers: corsHeaders });
    }
    
    if (phone && !validation.isValidPhone(phone)) {
      return NextResponse.json({
        success: false,
        message: 'Phone number must be 10 digits',
        data: null
      }, { status: 400, headers: corsHeaders });
    }
    
    if (!validation.isValidPassword(password)) {
      return NextResponse.json({
        success: false,
        message: 'Password does not meet security requirements',
        details: validation.getPasswordRequirements(),
        data: null
      }, { status: 400, headers: corsHeaders });
    }

    // Check if email already exists
    const existingUser = await models.Customer.findOne({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json({
        success: false,
        message: 'Email already registered',
        data: null
      }, { status: 409, headers: corsHeaders });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
      // Create the new user with optional profile fields
      const newUser = await models.Customer.create({
        name,
        email,
        password: hashedPassword,
        phone: phone || undefined,
        company_name: company_name || undefined,
        proof_of_identity: proof_of_identity || undefined,
        proof_of_address: proof_of_address || undefined,
        address: address || undefined
      });

      console.log('Customer created successfully with ID:', newUser.id);

      // Return success response without sensitive data
      const customerData = newUser.get({ plain: true });
      const { password: _, ...customerWithoutPassword } = customerData;
      
      // Generate token for immediate use
      const token = generateToken(newUser);
      
      // Send welcome email
      try {
        await mailService.sendWelcomeEmail(email, name);
      } catch (emailError) {
        console.error('Error sending welcome email:', emailError);
        // Continue despite email error
      }

      return NextResponse.json({
        success: true,
        message: 'Registration successful',
        data: {
          customer: customerWithoutPassword,
          token
        }
      }, { status: 201, headers: corsHeaders });
    } catch (error: any) {
      console.error('Database error during registration:', error);
      
      // Check for database column error
      if (error.name === 'SequelizeDatabaseError' && 
          error.message && 
          (error.message.includes("proof_of_identity") || 
           error.message.includes("column") || 
           error.message.includes("does not exist"))) {
        
        console.log('Missing column detected, attempting to fix schema...');
        
        // Try to fix the database schema before continuing
        try {
          // Get base URL or use default
          const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
          const fixEndpoint = `${baseUrl}/api/setup/fix-customers-table`;
          
          console.log(`Calling fix endpoint: ${fixEndpoint}`);
          const fixResponse = await fetch(fixEndpoint);
          
          if (!fixResponse.ok) {
            console.error('Failed to fix database schema:', await fixResponse.text());
            throw new Error('Failed to fix database schema');
          }
          
          console.log('Database schema fixed, retrying registration with essential fields');
          
          // Retry creating the user with only essential fields
          const retryUser = await models.Customer.create({
            name,
            email,
            password: hashedPassword,
            phone: phone || undefined,
            company_name: company_name || undefined
          });
          
          console.log('Customer created successfully after fixing schema, ID:', retryUser.id);
          
          const retryData = retryUser.get({ plain: true });
          const { password: __, ...retryWithoutPassword } = retryData;
          
          // Generate token
          const token = generateToken(retryUser);
          
          // Try sending welcome email
          try {
            await mailService.sendWelcomeEmail(email, name);
          } catch (emailError) {
            console.error('Error sending welcome email after retry:', emailError);
            // Continue despite email error
          }
          
          return NextResponse.json({
            success: true,
            message: 'Registration successful after fixing database schema',
            data: {
              customer: retryWithoutPassword,
              token
            }
          }, { status: 201, headers: corsHeaders });
          
        } catch (fixError) {
          console.error('Failed to fix schema and register user:', fixError);
          
          return NextResponse.json({
            success: false,
            message: 'Database schema issue. Please try the registration later or contact support.',
            error: 'DATABASE_SCHEMA_ERROR',
            data: { 
              fixEndpoint: '/api/setup/fix-customers-table',
              details: 'Try accessing this endpoint directly before registering'
            }
          }, { status: 500, headers: corsHeaders });
        }
      }
      
      // Handle other database errors
      return NextResponse.json({
        success: false,
        message: 'Failed to register user',
        error: error.name || 'DATABASE_ERROR',
        data: null
      }, { status: 500, headers: corsHeaders });
    }
  } catch (error) {
    console.error('Error in registration:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      error: 'INTERNAL_SERVER_ERROR',
      data: null
    }, { status: 500, headers: corsHeaders });
  }
<<<<<<< Updated upstream
}
<<<<<<< Updated upstream
=======
}
=======
>>>>>>> Stashed changes

/**
 * Handle OPTIONS request for CORS
 */
export async function OPTIONS(): Promise<NextResponse> {
  return handleOptionsRequest();
}

/**
 * Helper function to handle OPTIONS requests
 */
function handleOptionsRequest(): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders
  });
}
<<<<<<< Updated upstream
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
