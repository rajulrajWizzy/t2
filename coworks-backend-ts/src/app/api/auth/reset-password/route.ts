import { NextRequest, NextResponse } from 'next/server';
import models from '@/models';
import bcrypt from 'bcryptjs';
import { ApiResponse } from '@/types/common';
import { Op } from 'sequelize';
import validation from '@/utils/validation';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { token, password } = body;
    
    // Basic validation
    if (!token || !password) {
      const response: ApiResponse<null> = {
        success: false,
        message: 'Token and new password are required',
        data: null
      };
      
      return NextResponse.json(response, { status: 400 });
    }
    
    // Enhanced password validation
    if (!validation.isValidPassword(password)) {
      const response: ApiResponse<null> = {
        success: false,
        message: 'Password does not meet security requirements',
        data: null
      };
      
      return NextResponse.json(response, { status: 400 });
    }
    
    // Find the password reset token
    const passwordReset = await models.PasswordReset.findOne({
      where: {
        token,
        used: false,
        expires_at: {
          [Op.gt]: new Date() // Token has not expired
        }
      }
    });
    
    if (!passwordReset) {
      const response: ApiResponse<null> = {
        success: false,
        message: 'Invalid or expired reset token',
        data: null
      };
      
      return NextResponse.json(response, { status: 400 });
    }
    
    // Find the customer
    const customer = await models.Customer.findByPk(passwordReset.customer_id);
    if (!customer) {
      const response: ApiResponse<null> = {
        success: false,
        message: 'Customer not found',
        data: null
      };
      
      return NextResponse.json(response, { status: 404 });
    }
    
    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Update the customer's password
    await customer.update({ password: hashedPassword });
    
    // Mark the token as used
    await passwordReset.update({ used: true });
    
    const response: ApiResponse<null> = {
      success: true,
      message: 'Password has been reset successfully',
      data: null
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Reset password error:', error);
    
    const response: ApiResponse<null> = {
      success: false,
      message: 'Failed to reset password',
      data: null
    };
    
    return NextResponse.json(response, { status: 500 });
  }
}