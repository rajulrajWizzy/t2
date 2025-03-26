<<<<<<< Updated upstream
<<<<<<< Updated upstream
// src/app/api/test/route.ts
=======
// Explicitly set Node.js runtime for this route
export const runtime = "nodejs";
<<<<<<< Updated upstream
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

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    success: true,
    message: 'Test endpoint is working',
    data: {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    }
  }, { headers: corsHeaders });
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
=======
// Explicitly set Node.js runtime for this route
export const runtime = "nodejs";
=======
>>>>>>> Stashed changes
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextResponse } from 'next/server';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    success: true,
    message: 'Test endpoint is working',
    data: {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    }
  }, { headers: corsHeaders });
<<<<<<< Updated upstream
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
>>>>>>> Stashed changes
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
