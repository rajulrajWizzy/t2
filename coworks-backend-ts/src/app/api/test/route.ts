// Explicitly set Node.js runtime for this route
export const runtime = "nodejs";

// src/app/api/test/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ message: 'Test route is working' });
}