import { NextResponse } from 'next/server';

// A simple health check endpoint that never requires authentication
export async function GET() {
  return NextResponse.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
    message: 'API server is running'
  });
} 