// app/api/auth/login/route.js
import { NextResponse } from 'next/server';
import Customer from '../../../../models/customer.js';
import bcrypt from 'bcryptjs';
import { generateToken } from '../../../../config/jwt.js';

export async function POST(request) {
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
    const customer = await Customer.findOne({ where: { email } });
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
    const { password: _, ...customerData } = customer.get({ plain: true });
    
    return NextResponse.json({
      message: 'Login successful',
      token,
      customer: customerData
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { message: 'Login failed', error: error.message },
      { status: 500 }
    );
  }
}
