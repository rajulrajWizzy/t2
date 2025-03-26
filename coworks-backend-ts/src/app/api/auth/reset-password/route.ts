import { NextRequest, NextResponse } from 'next/server';
import models from '@/models';
import bcrypt from 'bcryptjs';
import { ApiResponse } from '@/types/common';
import { Op } from 'sequelize';
import validation from '@/utils/validation';
import { verifyResetToken } from '@/utils/token';
import { ResetToken } from '@/models/resetToken';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/**
 * Reset password endpoint for users
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { token, password } = body;
    
    // Validate token
    if (!token || token.length < 10) {
      const response: ApiResponse<null> = {
        success: false,
        message: 'Invalid token',
        data: null
      };
      
      return NextResponse.json(response, { status: 400 });
    }
    
    // Validate password
    if (!password || !validation.isValidPassword(password)) {
      const response: ApiResponse<null> = {
        success: false,
        message: 'Password does not meet security requirements',
        error: validation.getPasswordRequirements(),
        data: null
      };
      
      return NextResponse.json(response, { status: 400 });
    }
    
    // Verify reset token
    const tokenVerification = await verifyResetToken(token, 'user');
    
    if (!tokenVerification.valid || !tokenVerification.userId) {
      const response: ApiResponse<null> = {
        success: false,
        message: 'Invalid or expired token',
        data: null
      };
      
      return NextResponse.json(response, { status: 400 });
    }
    
    try {
      // Find user by ID
      const customer = await models.Customer.findByPk(tokenVerification.userId);
      
      if (!customer) {
        const response: ApiResponse<null> = {
          success: false,
          message: 'User not found',
          data: null
        };
        
        return NextResponse.json(response, { status: 404 });
      }
      
      // Hash the new password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Update user's password
      await customer.update({ password: hashedPassword });
      
      // Mark token as used
      await ResetToken.update(
        { is_used: true },
        { where: { 
          token, 
          user_id: tokenVerification.userId,
          user_type: 'user'
        }}
      );
      
      const response: ApiResponse<null> = {
        success: true,
        message: 'Password reset successfully',
        data: null
      };
      
      return NextResponse.json(response);
    } catch (error) {
      console.error('Error resetting password:', error);
      
      const response: ApiResponse<null> = {
        success: false,
        message: 'Failed to reset password',
        error: (error as Error).message,
        data: null
      };
      
      return NextResponse.json(response, { status: 500 });
    }
  } catch (error) {
    console.error('Reset password error:', error);
    
    const response: ApiResponse<null> = {
      success: false,
      message: 'Failed to reset password',
      error: (error as Error).message,
      data: null
    };
    
    return NextResponse.json(response, { status: 500 });
  }
<<<<<<< Updated upstream
}
=======
}

/**
 * Handle OPTIONS request for CORS
 */
export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders
  });
}
>>>>>>> Stashed changes
