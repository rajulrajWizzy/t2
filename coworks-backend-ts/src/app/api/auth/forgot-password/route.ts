// src/app/api/auth/forgot-password/route.ts
import { NextRequest, NextResponse } from 'next/server';
import models from '@/models';
import crypto from 'crypto';
import { ForgotPasswordRequest, ForgotPasswordResponse } from '@/types/auth';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json() as ForgotPasswordRequest;
    const { email } = body;
    
    // Basic validation
    if (!email) {
      return NextResponse.json(
        { success: false, message: 'Email is required' },
        { status: 400 }
      );
    }
    
    // Find the customer by email
    const customer = await models.Customer.findOne({ where: { email } });
    
    if (!customer) {
      // For security reasons, don't reveal that the email doesn't exist
      // Instead, return a success response
      return NextResponse.json({
        success: true,
        message: 'If your email is registered, you will receive a password reset link'
      });
    }
    
    // Generate a reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
    
    // Update the customer record with the reset token
    await customer.update({
      reset_token: resetToken,
      reset_token_expires: resetTokenExpires
    });
    
    // In a real-world application, you would send an email with the reset link
    // For development/testing purposes, we'll return the token in the response
    const response: ForgotPasswordResponse = {
      success: true,
      message: 'Password reset instructions have been sent to your email',
      reset_token: process.env.NODE_ENV === 'development' ? resetToken : undefined
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to process request', error: (error as Error).message },
      { status: 500 }
    );
  }
}