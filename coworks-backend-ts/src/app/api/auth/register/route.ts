// src/app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import models from '@/models';
import { generateToken } from '@/config/jwt';
import { UserRole, RegisterResponse } from '@/types/auth';
import { ApiResponse } from '@/types/common';
import validation from '@/utils/validation';
import bcrypt from 'bcryptjs';
import mailService from '@/utils/mailService';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Parse the request body
    const body = await request.json();
    const { name, email, password, phone, company_name, profile_picture } = body;
    
    // Validate required fields
    if (!name || !email || !password) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Name, email, and password are required',
        data: null
      }, { status: 400 });
    }
    
    // Validate name
    if (!validation.isValidName(name)) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Name is invalid',
        data: null
      }, { status: 400 });
    }
    
    // Validate email
    if (!validation.isValidEmail(email)) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Email is invalid',
        data: null
      }, { status: 400 });
    }
    
    // Validate password
    if (!validation.isValidPassword(password)) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, and one number',
        data: null
      }, { status: 400 });
    }
    
    // Check if phone is provided and validate
    if (phone && !validation.isValidPhone(phone)) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Phone number is invalid',
        data: null
      }, { status: 400 });
    }
    
    // Check if email already exists
    const existingCustomer = await models.Customer.findOne({ where: { email } });
    if (existingCustomer) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Email already registered',
        data: null
      }, { status: 409 });
    }
    
    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create the customer
    const customer = await models.Customer.create({
      name,
      email,
      password: hashedPassword,
      phone: phone || null,
      profile_picture: profile_picture || null,
      company_name: company_name || null,
      role: UserRole.CUSTOMER,
      is_admin: false,
      managed_branch_id: null
    });
    
    // Generate token
    const token = generateToken(customer);
    
    // Send welcome email if the service exists
    if (mailService.sendWelcomeEmail) {
      await mailService.sendWelcomeEmail(email, name);
    }
    
    // Return customer data (excluding password) and token
    const customerData = customer.get({ plain: true });
    const { password: _, ...customerWithoutPassword } = customerData;
    
    const response: ApiResponse<RegisterResponse> = {
      success: true,
      message: 'Registration successful',
      data: {
        message: 'Registration successful',
        customer: customerWithoutPassword,
        token
      }
    };
    
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Registration failed',
      data: null
    }, { status: 500 });
  }
}