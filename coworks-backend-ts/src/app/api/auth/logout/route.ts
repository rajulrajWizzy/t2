import { NextRequest, NextResponse } from 'next/server';
import models from '@/models';
import * as jwt from 'jsonwebtoken';
import { ApiResponse } from '@/types/common';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Get token from the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const response: ApiResponse<null> = {
        success: false,
        message: 'Unauthorized',
        data: null
      };
      
      return NextResponse.json(response, { status: 401 });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Blacklist the token
    try {
      // Parse token to get expiration time if possible
      let expiryDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // Default: 24 hours from now
      
      try {
        const decoded = jwt.decode(token);
        if (decoded && typeof decoded === 'object' && decoded.exp) {
          expiryDate = new Date(decoded.exp * 1000);
        }
      } catch (err) {
        console.warn('Could not decode token to get expiry, using default');
      }
      
      await models.BlacklistedToken.create({
        token,
        blacklisted_at: new Date(),
        expires_at: expiryDate
      });
      
      const response: ApiResponse<null> = {
        success: true,
        message: 'Logged out successfully',
        data: null
      };
      
      return NextResponse.json(response);
    } catch (error) {
      console.error('Error during logout:', error);
      
      const response: ApiResponse<null> = {
        success: false,
        message: 'Failed to log out',
        error: (error as Error).message,
        data: null
      };
      
      return NextResponse.json(response, { status: 500 });
    }
  } catch (error) {
    console.error('Logout error:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Logout failed',
      error: (error as Error).message
    }, { status: 500 });
  }
}