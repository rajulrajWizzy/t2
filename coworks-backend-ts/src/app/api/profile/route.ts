import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/config/jwt';
import models from '@/models';
import { ApiResponse } from '@/types/common';
import { Customer } from '@/types/auth';
import bcrypt from 'bcryptjs';
import validation from '@/utils/validation';
import { Op } from 'sequelize';

// GET current user profile
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Get token from the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Authorization token is required',
        data: null
      }, { status: 401 });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify the token
    const { valid, decoded } = await verifyToken(token);
    if (!valid || !decoded) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Invalid token',
        data: null
      }, { status: 401 });
    }
    
    // Get the customer data
    const customer = await models.Customer.findByPk(decoded.id);
    
    if (!customer) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Customer not found',
        data: null
      }, { status: 404 });
    }
    
    // Return customer data without password
    const customerData = customer.get({ plain: true });
    const { password, ...customerWithoutPassword } = customerData;
    
    return NextResponse.json<ApiResponse<Omit<Customer, 'password'>>>({
      success: true,
      message: 'Profile retrieved successfully',
      data: customerWithoutPassword
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Failed to fetch profile',
      data: null
    }, { status: 500 });
  }
}

// PUT update user profile
export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    // Get token from the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Authorization token is required',
        data: null
      }, { status: 401 });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify the token
    const { valid, decoded } = await verifyToken(token);
    if (!valid || !decoded) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Invalid token',
        data: null
      }, { status: 401 });
    }
    
    // Get the customer to update
    const customer = await models.Customer.findByPk(decoded.id);
    
    if (!customer) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Customer not found',
        data: null
      }, { status: 404 });
    }
    
    // Parse the request body
    const body = await request.json();
    const { 
      name, 
      email, 
      phone, 
      current_password, 
      new_password,
      profile_picture,
      company_name 
    } = body;
    
    // Create update object
    const updateData: any = {};
    
    // Validate and update name if provided
    if (name !== undefined) {
      if (!validation.isValidName(name)) {
        return NextResponse.json<ApiResponse<null>>({
          success: false,
          message: 'Name is invalid',
          data: null
        }, { status: 400 });
      }
      updateData.name = name;
    }
    
    // Validate and update email if provided
    if (email !== undefined) {
      if (!validation.isValidEmail(email)) {
        return NextResponse.json<ApiResponse<null>>({
          success: false,
          message: 'Email is invalid',
          data: null
        }, { status: 400 });
      }

      // Check if email is already taken
      const existingCustomer = await models.Customer.findOne({
        where: { email, id: { [Op.ne]: decoded.id } }
      });

      if (existingCustomer) {
        return NextResponse.json<ApiResponse<null>>({
          success: false,
          message: 'Email is already in use',
          data: null
        }, { status: 409 });
      }
      
      updateData.email = email;
    }
    
    // Validate and update phone if provided
    if (phone !== undefined) {
      if (phone && !validation.isValidPhone(phone)) {
        return NextResponse.json<ApiResponse<null>>({
          success: false,
          message: 'Phone number is invalid',
          data: null
        }, { status: 400 });
      }
      updateData.phone = phone;
    }
    
    // Update profile picture if provided
    if (profile_picture !== undefined) {
      updateData.profile_picture = profile_picture;
    }
    
    // Update company name if provided
    if (company_name !== undefined) {
      updateData.company_name = company_name;
    }
    
    // Update password if both current_password and new_password are provided
    if (current_password && new_password) {
      // Verify current password
      const isPasswordValid = await bcrypt.compare(current_password, customer.password);
      if (!isPasswordValid) {
        return NextResponse.json<ApiResponse<null>>({
          success: false,
          message: 'Current password is incorrect',
          data: null
        }, { status: 400 });
      }
      
      // Validate new password
      if (!validation.isValidPassword(new_password)) {
        return NextResponse.json<ApiResponse<null>>({
          success: false,
          message: 'New password does not meet security requirements',
          data: null
        }, { status: 400 });
      }
      
      // Hash new password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(new_password, salt);
      updateData.password = hashedPassword;
    }
    
    // Update customer
    await customer.update(updateData);
    
    // Get updated customer data without password
    const updatedCustomer = await models.Customer.findByPk(decoded.id);
    if (!updatedCustomer) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Failed to retrieve updated profile',
        data: null
      }, { status: 500 });
    }
    
    const customerData = updatedCustomer.get({ plain: true });
    const { password, ...customerWithoutPassword } = customerData;
    
    return NextResponse.json<ApiResponse<Omit<Customer, 'password'>>>({
      success: true,
      message: 'Profile updated successfully',
      data: customerWithoutPassword
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Failed to update profile',
      data: null
    }, { status: 500 });
  }
}