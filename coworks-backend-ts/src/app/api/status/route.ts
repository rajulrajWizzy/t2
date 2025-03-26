<<<<<<< Updated upstream
=======
// Explicitly set Node.js runtime for this route
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

>>>>>>> Stashed changes
import { NextResponse } from 'next/server';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// A simple health check endpoint that never requires authentication
export async function GET(): Promise<NextResponse> {
  try {
    return NextResponse.json({
      success: true,
      message: 'API is running',
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
      }
    }, { headers: corsHeaders });
  } catch (error) {
    console.error('API status check failed:', error);
    
    return NextResponse.json({
      success: false,
      message: 'API is experiencing issues',
      data: {
        status: 'unhealthy',
        error: (error as Error).message
      }
    }, { status: 500, headers: corsHeaders });
  }
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