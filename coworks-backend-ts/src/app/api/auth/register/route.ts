// src/app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import models from '@/models';
import bcrypt from 'bcryptjs';
import { RegisterRequest, RegisterResponse } from '@/types/auth';
import { generateToken } from '@/config/jwt';
import validation from '@/utils/validation';
import mailService from '@/utils/mailService';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json() as RegisterRequest;
    const { name, email, phone, password, profile_picture, company_name } = body;
    
    // Basic validation
    if (!name || !email || !password) {
      return NextResponse.json(
        { message: 'Name, email, and password are required' },
        { status: 400 }
      );
    }
    
    // Name validation
    if (!validation.isValidName(name)) {
      return NextResponse.json(
        { message: 'Name cannot be empty or contain only whitespace' },
        { status: 400 }
      );
    }
    
    // Email validation
    if (!validation.isValidEmail(email)) {
      return NextResponse.json(
        { message: 'Please provide a valid email address' },
        { status: 400 }
      );
    }
    
    // Phone validation (if provided)
    if (phone && !validation.isValidPhone(phone)) {
      return NextResponse.json(
        { message: 'Phone number must be 10 digits' },
        { status: 400 }
      );
    }
    
    // Password validation
    if (!validation.isValidPassword(password)) {
      return NextResponse.json(
        { message: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }
    
    // Check if email already exists
    const existingUser = await models.Customer.findOne({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { message: 'Email already registered' },
        { status: 409 }
      );
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create new customer
    const customer = await models.Customer.create({
      name,
      email,
      phone,
      password: hashedPassword,
      profile_picture: profile_picture || undefined,
      company_name: company_name || undefined
    });
    
    console.log('Customer created successfully with ID:', customer.id);
    
    // Return response without password
    const customerData = customer.get({ plain: true });
    const { password: _, ...customerWithoutPassword } = customerData;
    
    // Generate token for immediate use
    const token = generateToken(customer);
    
    // Send welcome email
    await mailService.sendWelcomeEmail(email, name);
    
    const response: RegisterResponse = {
      message: 'Registration successful',
      customer: customerWithoutPassword as any,
      token // Add token to the response
    };
    
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { message: 'Registration failed', error: (error as Error).message },
      { status: 500 }
    );
  }
}