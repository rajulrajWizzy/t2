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
import { generateToken } from '@/config/jwt';
import { LoginRequest, LoginResponse } from '@/types/auth';
import validation from '@/utils/validation';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json() as LoginRequest;
    const { email, password } = body;
    
    // Basic validation
    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email and password are required' },
        { status: 400 }
      );
    }
    
    // Email format validation
    if (!validation.isValidEmail(email)) {
      return NextResponse.json(
        { 
          message: 'Invalid email format',
          details: 'Email must be in a valid format (e.g., user@example.com)'
        },
        { status: 400 }
      );
    }
    
    // Find customer by email
    const customer = await models.Customer.findOne({ where: { email } });
    if (!customer) {
      return NextResponse.json(
        { message: 'Invalid email or password' },
        { status: 401 }
      );
    }
    
    // Compare passwords
    const isPasswordValid = await bcrypt.compare(password, customer.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { message: 'Invalid email or password' },
        { status: 401 }
      );
    }
    
    // Generate JWT token
    const token = generateToken(customer);
    
    // Return token and customer data (excluding password)
    const customerData = customer.get({ plain: true });
    const { password: _, ...customerWithoutPassword } = customerData;    
    
    const response: LoginResponse = {
      message: 'Login successful',
      token,
      customer: customerWithoutPassword as any // Need to cast here as we've removed password field
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { message: 'Login failed', error: (error as Error).message },
      { status: 500 }
    );
  }
}
