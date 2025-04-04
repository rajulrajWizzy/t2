// Explicitly set Node.js runtime for this route
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from 'next/server';
import models from '@/models';
import * as jwt from 'jsonwebtoken';
import { ApiResponse } from '@/types/api';
//fix logout
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Get token from the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const response: ApiResponse<null> = {
        success: false,
        message: 'Authorization token is required',
        data: null
      };
      
      return NextResponse.json(response, { status: 401 });
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
      // Decode the token to get expiration time (without verifying)
      const decoded = jwt.decode(token) as { exp?: number };
      
      if (!decoded || !decoded.exp) {
        return NextResponse.json<ApiResponse<null>>({
          success: false,
          message: 'Invalid token format',
          data: null
        }, { status: 400 });
      }
      
      // Store the token in the blacklist
      await models.BlacklistedToken.create({
        token,
        expires_at: new Date(decoded.exp * 1000) // Convert UNIX timestamp to Date
      });
      
      // Clear cookies if they exist
      const response = NextResponse.json<ApiResponse<null>>({
        success: true,
        message: 'Logout successful',
        data: null
      });
      
      // Clear cookies that might be used for authentication
      response.cookies.delete('token');
      response.cookies.delete('adminToken');
      response.cookies.delete('refreshToken');
      
      return response;
    } catch (error) {
      console.error('Error decoding token:', error);
      
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Invalid token',
        data: null
      }, { status: 400 });
    }
  } catch (error) {
    console.error('Logout error:', error);
    
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Logout failed',
      errors: [{ message: (error as Error).message }],
      data: null
    }, { status: 500 });
  }
}
