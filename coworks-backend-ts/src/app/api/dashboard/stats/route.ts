// Explicitly set Node.js runtime for this route
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from 'next/server';
import { corsHeaders } from '@/utils/jwt-wrapper';

// This is a wrapper for the admin/dashboard/stats endpoint to ensure compatibility
// with components that expect the main API response format
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('API Wrapper: /api/dashboard/stats -> /api/admin/dashboard/stats');
    
    // Forward the request to the admin API
    const { searchParams } = new URL(request.url);
    const adminEndpoint = new URL('/api/admin/dashboard/stats', request.url);
    
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
    console.error('Error in /api/dashboard/stats wrapper:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Server error in dashboard stats API wrapper',
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