export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextResponse } from 'next/server';
import { ApiResponse } from '@/types/common';

/**
 * Handles the case where the URL is missing the 's' in 'database-status'
 */
export async function GET(): Promise<NextResponse> {
  const response: ApiResponse<null> = {
    success: false,
    message: 'This endpoint is mistyped. Please use /api/setup/database-status instead (with an "s" at the end)',
    data: null
  };
  
  return NextResponse.json(response, { status: 404 });
} 