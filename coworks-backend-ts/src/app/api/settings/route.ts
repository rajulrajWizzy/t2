// Explicitly set Node.js runtime for this route
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from 'next/server';
import { corsHeaders } from '@/utils/jwt-wrapper';

// This is a wrapper for the admin/settings endpoint to ensure compatibility
// with components that expect the main API response format
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('API Wrapper: /api/settings -> /api/admin/settings');
    
    // Forward the request to the admin API
    const { searchParams } = new URL(request.url);
    const adminEndpoint = new URL('/api/admin/settings', request.url);
    
    // Copy all search params
    searchParams.forEach((value, key) => {
      adminEndpoint.searchParams.append(key, value);
    });
    
    // Create a new request with the same headers
    const headers = new Headers(request.headers);
    const adminRequest = new Request(adminEndpoint, {
      method: request.method,
      headers,
      cache: 'no-store'
    });
    
    // Call the admin API
    const response = await fetch(adminRequest);
    const data = await response.json();
    
    // Return the response directly
    return NextResponse.json(data, { 
      status: response.status, 
      headers: corsHeaders 
    });
  } catch (error) {
    console.error('Error in /api/settings wrapper:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Server error in settings API wrapper',
        error: (error as Error).message 
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

// POST method handles settings updates
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('API Wrapper: POST /api/settings -> /api/admin/settings');
    
    // Forward the request to the admin API
    const adminEndpoint = new URL('/api/admin/settings', request.url);
    
    // Create a new request with the same headers and body
    const headers = new Headers(request.headers);
    const adminRequest = new Request(adminEndpoint, {
      method: 'POST',
      headers,
      body: request.body,
      cache: 'no-store'
    });
    
    // Call the admin API
    const response = await fetch(adminRequest);
    const data = await response.json();
    
    // Return the response directly
    return NextResponse.json(data, { 
      status: response.status, 
      headers: corsHeaders 
    });
  } catch (error) {
    console.error('Error in POST /api/settings wrapper:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Server error in settings API wrapper',
        error: (error as Error).message 
      },
      { status: 500, headers: corsHeaders }
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