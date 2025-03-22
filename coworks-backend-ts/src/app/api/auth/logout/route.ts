// Explicitly set Node.js runtime for this route

// Explicitly set Node.js runtime for this route

// Explicitly set Node.js runtime for this route
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from 'next/server';
import models from '@/models';
import * as jwt from 'jsonwebtoken';
import { ApiResponse } from '@/types/common';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Get token from the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const response: ApiResponse = {
        success: false,
        message: 'Authorization token is required'
      };
      
      return NextResponse.json(response, { status: 401 });
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
      // Decode the token to get expiration time (without verifying)
      const decoded = jwt.decode(token) as { exp?: number };
      
      if (!decoded || !decoded.exp) {
        return NextResponse.json({
          success: false,
          message: 'Invalid token format'
        }, { status: 400 });
      }
      
      // Store the token in the blacklist
      await models.BlacklistedToken.create({
        token,
        expires_at: new Date(decoded.exp * 1000) // Convert UNIX timestamp to Date
      });
      
      const response: ApiResponse = {
        success: true,
        message: 'Logout successful'
      };
      
      return NextResponse.json(response);
    } catch (error) {
      console.error('Error decoding token:', error);
      
      return NextResponse.json({
        success: false,
        message: 'Invalid token'
      }, { status: 400 });
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
