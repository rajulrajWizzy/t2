import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import models from '@/models';
import { generateToken } from '@/config/jwt';
import { UserRole } from '@/types/auth';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { email, password } = body;
    
    // Basic validation
    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email and password are required' },
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
    
    const response = {
      message: 'Login successful',
      token,
      user: {
        id: customerWithoutPassword.id,
        email: customerWithoutPassword.email,
        name: customerWithoutPassword.name,
        role: customerWithoutPassword.role,
        managed_branch_id: customerWithoutPassword.managed_branch_id,
      }
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