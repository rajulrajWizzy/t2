import { NextRequest, NextResponse } from 'next/server';
import models from '@/models';
import { ApiResponse } from '@/types/common';
import mailService from '@/utils/mailService';
import validation from '@/utils/validation';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { email } = body;
    
    // Basic validation
    if (!email) {
      const response: ApiResponse<null> = {
        success: false,
        message: 'Email is required',
        data: null
      };
      
      return NextResponse.json(response, { status: 400 });
    }
    
    // Email format validation
    if (!validation.isValidEmail(email)) {
      const response: ApiResponse<null> = {
        success: false,
        message: 'Invalid email format',
        data: null
      };
      
      return NextResponse.json(response, { status: 400 });
    }
    
    // Find customer by email
    const customer = await models.Customer.findOne({ where: { email } });
    
    // Even if customer is not found, return success for security
    if (!customer) {
      const response: ApiResponse<null> = {
        success: true,
        message: 'If your email is registered with us, you will receive password reset instructions',
        data: null
      };
      
      return NextResponse.json(response);
    }
    
    // Invalidate any existing reset tokens for this customer
    await models.PasswordReset.update(
      { used: true },
      { where: { customer_id: customer.id, used: false } }
    );
    
    // Generate and save new reset token
    const resetToken = await models.PasswordReset.create({
      customer_id: customer.id,
      token: Math.random().toString(36).substring(2, 15),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      used: false
    });
    
    // Send reset email
    const emailSent = await mailService.sendPasswordResetEmail(
      customer.email,
      customer.name,
      resetToken.token
    );

    if (!emailSent) {
      console.error('Failed to send password reset email');
      const response: ApiResponse<null> = {
        success: false,
        message: 'Failed to send password reset email. Please try again later.',
        data: null
      };
      return NextResponse.json(response, { status: 500 });
    }
    
    const response: ApiResponse<null> = {
      success: true,
      message: 'If your email is registered with us, you will receive password reset instructions',
      data: null
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Password reset error:', error);
    
    const response: ApiResponse<null> = {
      success: false,
      message: 'An error occurred while processing your request',
      data: null
    };
    
    return NextResponse.json(response, { status: 500 });
  }
}