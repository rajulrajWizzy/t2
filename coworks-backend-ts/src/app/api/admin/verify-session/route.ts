import { NextRequest, NextResponse } from 'next/server';
import { verifyTokenFromRequest } from '@/utils/jwt';
import { corsHeaders } from '@/utils/jwt-wrapper';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = "nodejs";

// Add CORS headers with Access-Control-Allow-Credentials
const updatedCorsHeaders = {
  'Access-Control-Allow-Origin': '*', 
  'Access-Control-Allow-Methods': 'GET, DELETE, PATCH, POST, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization',
  'Access-Control-Allow-Credentials': 'true'
};

export async function GET(request: NextRequest) {
  try {
    // Verify the token from the request
    const tokenResult = await verifyTokenFromRequest(request);
    
    // If tokenResult is a NextResponse, it means verification failed
    if (tokenResult instanceof NextResponse) {
      return tokenResult;
    }
    
    // Token is valid, return success response
    const response = NextResponse.json({
      success: true,
      message: "Session is valid",
      data: {
        authenticated: true,
        admin: {
          id: tokenResult.id,
          email: tokenResult.email,
          name: tokenResult.name,
          role: tokenResult.role,
          is_admin: tokenResult.is_admin
        }
      }
    }, { status: 200 });
    
    // Add CORS headers manually to ensure they're set properly
    Object.entries(updatedCorsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  } catch (error) {
    console.error('Error in session verification:', error);
    
    // Return error response
    const errorResponse = NextResponse.json({
      success: false,
      message: "Session verification failed",
      data: {
        authenticated: false
      }
    }, { status: 401 });
    
    // Add CORS headers to error response
    Object.entries(updatedCorsHeaders).forEach(([key, value]) => {
      errorResponse.headers.set(key, value);
    });
    
    return errorResponse;
  }
}

// OPTIONS handler for CORS
export async function OPTIONS(request: NextRequest) {
  const response = new NextResponse(null, { 
    status: 204
  });
  
  // Add all CORS headers manually
  Object.entries(updatedCorsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  return response;
}

// Fallback admin data for development/demo
function getFallbackAdminData() {
  return {
    id: 6,
    email: "admin@coworks.com",
    name: "Super Admin",
    role: "super_admin",
    branch_id: null,
    permissions: {
      seats: ["read", "create", "update", "delete"],
      admins: ["read", "create", "update", "delete"],
      reports: ["read", "create"],
      support: ["read", "update", "delete"],
      bookings: ["read", "create", "update", "delete"],
      branches: ["read", "create", "update", "delete"],
      payments: ["read", "update"],
      settings: ["read", "update"],
      customers: ["read", "create", "update", "delete"],
      seating_types: ["read", "create", "update", "delete"]
    },
    is_admin: true,
    lastLogin: new Date().toISOString()
  };
} 