// app/api/auth/register/route.js
import { NextResponse } from 'next/server';
import Customer from '../../../../models/customer.js';
import bcrypt from 'bcryptjs';

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, email, phone, password } = body;
    
    // Basic validation
    if (!name || !email || !password) {
      return NextResponse.json(
        { message: 'Name, email, and password are required' },
        { status: 400 }
      );
    }
    
    // Check if email already exists
    const existingUser = await Customer.findOne({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { message: 'Email already registered' },
        { status: 409 }
      );
    }
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create new customer
    const customer = await Customer.create({
      name,
      email,
      phone,
      password: hashedPassword
    });
    
    // Return response without password
    const { password: _, ...customerData } = customer.get({ plain: true });
    
    return NextResponse.json(
      { message: 'Registration successful', customer: customerData },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { message: 'Registration failed', error: error.message },
      { status: 500 }
    );
  }
}
