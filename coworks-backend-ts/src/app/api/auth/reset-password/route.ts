// Explicitly set Node.js runtime for this route
export const runtime = "nodejs";

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
      const response: ApiResponse = {
        success: false,
        message: 'Token and new password are required'
      };
      
      return NextResponse.json(response, { status: 400 });
    }
    
    // Enhanced password validation
    if (!validation.isValidPassword(password)) {
      const response: ApiResponse = {
        success: false,
        message: 'Password does not meet security requirements',
        error: validation.getPasswordRequirements()
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
      const response: ApiResponse = {
        success: false,
        message: 'Invalid or expired reset token'
      };
      
      return NextResponse.json(response, { status: 400 });
    }
    
    // Find the customer
    const customer = await models.Customer.findByPk(passwordReset.customer_id);
    if (!customer) {
      const response: ApiResponse = {
        success: false,
        message: 'Customer not found'
      };
      
      return NextResponse.json(response, { status: 404 });
    }
    
    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Update the customer's password
    await customer.update({ password: hashedPassword });
    
    // Mark the token as used
    await passwordReset.update({ used: true });
    
    const response: ApiResponse = {
      success: true,
      message: 'Password has been reset successfully'
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Reset password error:', error);
    
    const response: ApiResponse = {
      success: false,
      message: 'Failed to reset password',
      error: (error as Error).message
    };
    
    return NextResponse.json(response, { status: 500 });
  }
}