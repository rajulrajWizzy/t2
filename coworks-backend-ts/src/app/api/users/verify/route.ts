// Explicitly set Node.js runtime for this route
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from 'next/server';
import { corsHeaders, verifyJWT } from '@/utils/jwt-wrapper';

// API wrapper route that proxies to the admin endpoint
export async function GET(request: NextRequest) {
  try {
    console.log('API Wrapper: /api/users/verify -> /api/admin/users/verify');
    
    // Proxy the request to the admin endpoint
    const { pathname, search } = new URL(request.url);
    const targetPath = pathname.replace('/api/users', '/api/admin/users');
    const targetUrl = `${targetPath}${search}`;
    
    // Forward the original headers
    const headers = new Headers(request.headers);
    
    // Make the proxy request
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers
    });
    
    // Get the response data
    const data = await response.json();
    
    // Return the admin API response
    return NextResponse.json(data, { 
      status: response.status,
      headers: response.headers
    });
  } catch (error) {
    console.error('Error in /api/users/verify wrapper:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Error forwarding request',
      error: (error as Error).message 
    }, { status: 500 });
  }
}

/**
 * Token verification endpoint for all users
 * This is a wrapper that delegates to the appropriate verification endpoint
 * based on the token type (admin or regular user)
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('API Wrapper: /api/users/verify -> /api/admin/users/verify');
    
    // Get token from authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Authentication token is required' },
        { status: 401 }
      );
    }
    
    const token = authHeader.split(' ')[1];
    
    // For simplicity, forward to the appropriate verification endpoint
    try {
      // Check if it's an admin token by extracting and inspecting it
      const payload = await verifyJWT(token);
      
      if (payload?.is_admin) {
        // Forward to admin verification endpoint
        const adminVerifyUrl = new URL('/api/admin/users/verify', request.url);
        
        // Use type assertion to allow the duplex option
        const requestInit = {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader
          },
          body: JSON.stringify({}),
          duplex: 'half' // Required when sending a body in Node.js 18+
        } as RequestInit;
        
        const response = await fetch(adminVerifyUrl, requestInit);
        
        // Return the response from the admin endpoint
        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
      } else {
        // Forward to regular user verification endpoint
        const userVerifyUrl = new URL('/api/customers/verify', request.url);
        
        // Use type assertion to allow the duplex option
        const requestInit = {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader
          },
          body: JSON.stringify({}),
          duplex: 'half' // Required when sending a body in Node.js 18+
        } as RequestInit;
        
        const response = await fetch(userVerifyUrl, requestInit);
        
        // Return the response from the user endpoint
        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
      }
    } catch (error) {
      console.error('Error in /api/users/verify wrapper:', error);
      return NextResponse.json(
        { success: false, message: 'Invalid or expired token' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Error in /api/users/verify wrapper:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Error verifying token', 
        error: (error as Error).message 
      },
      { status: 500 }
    );
  }
}

// OPTIONS handler for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders
  });
} 