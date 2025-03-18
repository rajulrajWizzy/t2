import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import models from '@/models';
import { generateToken } from '@/config/jwt';
import { UserRole, LoginResponse } from '@/types/auth';
import { ApiResponse } from '@/types/common';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { email, password } = body;
    
    // Basic validation
    if (!email || !password) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Email and password are required',
        data: null
      }, { status: 400 });
    }
    
    // Find customer by email
    const customer = await models.Customer.findOne({ where: { email } });
    if (!customer) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Invalid email or password',
        data: null
      }, { status: 401 });
    }
    
    // Compare passwords
    const isPasswordValid = await bcrypt.compare(password, customer.password);
    if (!isPasswordValid) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Invalid email or password',
        data: null
      }, { status: 401 });
    }
    
    // Generate JWT token
    const token = generateToken(customer);
    
    // Return token and customer data (excluding password)
    const customerData = customer.get({ plain: true });
    const { password: _, ...customerWithoutPassword } = customerData;    
    
    const response: ApiResponse<LoginResponse> = {
      success: true,
      message: 'Login successful',
      data: {
        message: 'Login successful',
        token,
        customer: customerWithoutPassword
      }
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Login failed',
      data: null
    }, { status: 500 });
  }
}