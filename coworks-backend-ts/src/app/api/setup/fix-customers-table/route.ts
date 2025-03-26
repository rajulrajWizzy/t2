// Explicitly set Node.js runtime
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from 'next/server';
import sequelize from '@/config/database';
import { ApiResponse } from '@/types/common';
import { QueryTypes } from 'sequelize';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/**
 * Public endpoint to fix customers table by adding missing columns
 * This endpoint does not require authentication
 * @returns API response with status of the fix
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    return NextResponse.json<ApiResponse<any>>({
      success: true,
      message: 'Fix customers table endpoint is disabled during deployment',
      data: null
    }, { status: 200, headers: corsHeaders });
  } catch (error) {
    console.error('Error fixing customers table:', error);
    return NextResponse.json<ApiResponse<any>>({
      success: false,
      message: 'Failed to fix customers table',
      data: { 
        error: (error as Error).message,
        stack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
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