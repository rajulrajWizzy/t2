 // Explicitly set Node.js runtime for this route
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from 'next/server';
import sequelize from '@/config/database';
import models from '@/models';
import bcrypt from 'bcryptjs';
import { RegisterRequest } from '@/types/auth';
import { generateToken } from '@/utils/jwt-wrapper';
import validation from '@/utils/validation';
import { ApiResponse } from '@/types/common';
import { uploadMiddleware } from '@/utils/uploadMiddleware';
import { RegistrationData, FileUploadResponse } from '@/types/upload';
import path from 'path';

// Add CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('[Customer Register] Processing registration request with files');
    
    // Create multer instance for profile picture
    const upload = uploadMiddleware.single('profilePicture');
    
    // Handle file upload
    const formData = await request.formData();
    
    // Extract form fields
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const phone = formData.get('phone') as string;
    const companyName = formData.get('company_name') as string;
    const address = formData.get('address') as string;
    
    // Get profile picture file
    const profilePicture = formData.get('profilePicture') as File;
    let profilePicturePath = '';
    
    if (profilePicture) {
      const bytes = await profilePicture.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      // Generate unique filename
      const fileName = `${Date.now()}-${profilePicture.name}`;
      const filePath = path.join(process.cwd(), 'uploads', 'profile_picture', fileName);
      
      // Save file
      await require('fs').promises.writeFile(filePath, buffer);
      profilePicturePath = `/uploads/profile_picture/${fileName}`;
    }
    
    // Basic validation
    if (!name || !email || !password || !companyName) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, message: 'Name, email, password, and company name are required', data: null },
        { status: 400, headers: corsHeaders }
      );
    }
    
    // Validate name
    if (!validation.isValidName(name)) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, message: 'Name cannot be empty or contain only whitespace', data: null },
        { status: 400, headers: corsHeaders }
      );
    }
    
    // Validate email
    if (!validation.isValidEmail(email)) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, message: 'Please provide a valid email address', data: null },
        { status: 400, headers: corsHeaders }
      );
    }
    
    // Validate password
    if (!validation.isValidPassword(password)) {
      return NextResponse.json<ApiResponse<null>>(
        { 
          success: false, 
          message: 'Password does not meet security requirements',
          data: null,
          error: validation.getPasswordRequirements()
        },
        { status: 400, headers: corsHeaders }
      );
    }
    
    // Check if email already exists
    const existingUser = await models.Customer.findOne({ where: { email } });
    if (existingUser) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, message: 'Email already registered', data: null },
        { status: 409, headers: corsHeaders }
      );
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create customer
    const customer = await models.Customer.create({
      name,
      email,
      password: hashedPassword,
      phone,
      company_name: companyName,
      address,
      profile_picture: profilePicturePath,
      verification_status: 'PENDING'
    });
    
    // Generate token
    const token = await generateToken({
      id: customer.id,
      email: customer.email,
      name: customer.name,
      role: 'customer'
    });
    
    return NextResponse.json<ApiResponse<{ token: string }>>(
      {
        success: true,
        message: 'Registration successful',
        data: { token }
      },
      { headers: corsHeaders }
    );
    
  } catch (error) {
    console.error('[Customer Register] Error:', error);
    return NextResponse.json<ApiResponse<null>>(
      { 
        success: false, 
        message: 'Registration failed', 
        error: (error as Error).message,
        data: null 
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

// Handle OPTIONS request for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders
  });
}