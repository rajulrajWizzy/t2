// src/app/api/auth/reset-password/route.ts
import { NextRequest, NextResponse } from 'next/server';
import models from '@/models';
import bcrypt from 'bcryptjs';
import { ResetPasswordRequest, ResetPasswordResponse } from '@/types/auth';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json() as ResetPasswordRequest;
    const { token, password } = body;
    
    // Basic validation
    if (!token || !password) {
      return NextResponse.json(
        { success: false, message: 'Token and password are required' },
        { status: 400 }
      );
    }
    
    // Find the customer with the reset token
    const customer = await models.Customer.findOne({
      where: {
        reset_token: token,
        reset_token_expires: {
          [models.sequelize.Op.gt]: new Date() // token must not be expired
        }
      }
    });
    
    if (!customer) {
      return NextResponse.json(
        { success: false, message: 'Invalid or expired reset token' },
        { status: 400 }
      );
    }
    
    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Update the customer record with the new password and clear the reset token
    await customer.update({
      password: hashedPassword,
      reset_token: null,
      reset_token_expires: null
    });
    
    const response: ResetPasswordResponse = {
      success: true,
      message: 'Password has been reset successfully. You can now log in with your new password.'
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to reset password', error: (error as Error).message },
      { status: 500 }
    );
  }
}