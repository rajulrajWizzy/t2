import { NextRequest, NextResponse } from 'next/server';
import models from '@/models';
import { ApiResponse } from '@/types/common';
import mailService from '@/utils/mailService';
import validation from '@/utils/validation';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/**
 * Forgot password endpoint for users
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { email } = body;
    
    // Validate email
    if (!email) {
      const response: ApiResponse<null> = {
        success: false,
        message: 'Email is required',
        error: 'VALIDATION_ERROR',
        data: null
      };
      
      return NextResponse.json(response, { status: 400, headers: corsHeaders });
    }
    
    if (!validation.isValidEmail(email)) {
      const response: ApiResponse<null> = {
        success: false,
        message: 'Please provide a valid email address',
        error: 'VALIDATION_ERROR',
        data: null
      };
      
      return NextResponse.json(response, { status: 400, headers: corsHeaders });
    }
    
    // Find the customer
    const customer = await models.Customer.findOne({ where: { email } });
    
    if (!customer) {
      const response: ApiResponse<null> = {
        success: false,
        message: 'We could not find an account with that email',
        error: 'NOT_FOUND',
        data: null
      };
      
      return NextResponse.json(response, { status: 404, headers: corsHeaders });
    }
    
    // Invalidate any existing reset tokens for this customer
    try {
      await models.PasswordReset.update(
        { used: true },
        { where: { customer_id: customer.id, used: false } }
      );
    } catch (error) {
      console.warn('Could not invalidate existing password reset tokens:', error);
      // Continue with token creation
    }
    
    // Create a new password reset token
    let token = '';
    let expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
    
    try {
      // Try to use PasswordReset model
      token = models.PasswordReset.generateToken();
      expires_at = models.PasswordReset.getExpiryDate();
    } catch (error) {
      // Fallback to manual token generation
      console.warn('Using fallback token generation method:', error);
      token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }
    
    try {
      await models.PasswordReset.create({
        customer_id: customer.id,
        token,
        expires_at
      });
    } catch (error) {
      // If PasswordReset model fails, try using ResetToken model
      try {
        const { ResetToken } = await import('@/models/resetToken');
        await ResetToken.create({
          user_id: customer.id,
          token,
          expires_at,
          user_type: 'user',
          is_used: false
        });
      } catch (resetTokenError) {
        console.error('Failed to create reset token:', resetTokenError);
        throw new Error('Failed to create password reset token');
      }
    }
    
    // Send password reset email
    try {
      const emailSent = await mailService.sendPasswordResetEmail(
        customer.email,
        customer.name,
        token
      );
      
      if (!emailSent) {
        console.error('Failed to send password reset email');
      }
    } catch (emailError) {
      console.error('Email sending error:', emailError);
      // Continue despite email error, as token is created successfully
    }
    
    const response: ApiResponse<null> = {
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent',
      data: null
    };
    
    return NextResponse.json(response, { status: 200, headers: corsHeaders });
  } catch (error) {
    console.error('Error in forgot password process:', error);
    
    const response: ApiResponse<null> = {
      success: false,
      message: 'Failed to process password reset request',
      error: (error as Error).message,
      data: null
    };
    
    return NextResponse.json(response, { status: 500, headers: corsHeaders });
  }
<<<<<<< Updated upstream
}
<<<<<<< Updated upstream
<<<<<<< Updated upstream
=======
}
=======
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes

/**
 * Handle OPTIONS request for CORS
 */
export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders
  });
}
<<<<<<< Updated upstream
<<<<<<< Updated upstream
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
