export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { path?: string[] } }
): Promise<NextResponse> {
  const path = params.path ? `/${params.path.join('/')}` : '/';
  
  return NextResponse.json({
    success: false,
    message: `API endpoint not found: /api${path}`,
    data: {
      availableEndpoints: [
        '/api/status',
        '/api/test',
        '/api/setup/database-status',
        '/api/auth/login',
        '/api/auth/register',
        '/api/auth/forgot-password',
        '/api/auth/reset-password',
        '/api/admin/auth/login',
        '/api/admin/auth/reset-password'
      ]
    }
  }, { status: 404 });
}

// Handle other methods too
export async function POST(
  request: NextRequest,
  { params }: { params: { path?: string[] } }
): Promise<NextResponse> {
  return GET(request, { params });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { path?: string[] } }
): Promise<NextResponse> {
  return GET(request, { params });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { path?: string[] } }
): Promise<NextResponse> {
  return GET(request, { params });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { path?: string[] } }
): Promise<NextResponse> {
  return GET(request, { params });
} 