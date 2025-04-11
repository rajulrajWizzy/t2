// Explicitly set Node.js runtime for this route
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from 'next/server';
import { corsHeaders } from '@/utils/jwt-wrapper';
import { verifyAuth } from '@/utils/jwt';
import { ApiResponse } from '@/types/api';

/**
 * GET /api/support - Get information about support API
 */
export async function GET(request: NextRequest) {
  try {
    // Verify customer authentication
    const authResult = await verifyAuth(request);
    if ('status' in authResult) {
      return authResult as NextResponse;
    }
    
    const apiInfo = {
      name: "Excel Coworks Support API",
      version: "1.0.0",
      endpoints: [
        {
          path: "/api/support/tickets",
          methods: ["GET", "POST"],
          description: "List all tickets or create new ticket"
        },
        {
          path: "/api/support/tickets/:id",
          methods: ["GET", "PUT"],
          description: "View ticket details or reopen a closed ticket"
        },
        {
          path: "/api/support/tickets/messages",
          methods: ["POST"],
          description: "Add message to an existing ticket"
        }
      ],
      description: "API for customer support ticket management"
    };
    
    return NextResponse.json<ApiResponse<typeof apiInfo>>({
      success: true,
      message: "Support API information",
      data: apiInfo
    }, { status: 200, headers: corsHeaders });
    
  } catch (error) {
    console.error('Support API info error:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Failed to retrieve API information',
      data: null
    }, { status: 500, headers: corsHeaders });
  }
}

/**
 * OPTIONS handler for CORS
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders
  });
} 