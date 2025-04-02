// Explicitly set Node.js runtime for this route
export const runtime = "nodejs";

import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

/**
 * Middleware to verify the request is from a customer
 * @param request The incoming request
 * @returns NextResponse error if not authenticated as customer, null if authentication passes
 */
export async function requireCustomer(request: NextRequest) {
  try {
    // Get token from authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret') as any;
    
    if (!decoded) {
      return NextResponse.json(
        { success: false, message: 'Invalid authentication token' },
        { status: 401 }
      );
    }
    
    // Verify user is a customer
    const role = decoded.role;
    if (role && (role === 'admin' || role === 'super_admin' || role === 'branch_admin' || role === 'staff')) {
      return NextResponse.json(
        { success: false, message: 'This endpoint is for customers only' },
        { status: 403 }
      );
    }
    
    // Token is valid and user is a customer, continue
    return null;
  } catch (error) {
    console.error('Customer authentication error:', error);
    return NextResponse.json(
      { success: false, message: 'Authentication failed', error: (error as Error).message },
      { status: 401 }
    );
  }
} 