// Explicitly set Node.js runtime for this route

// src/app/api/test/route.ts
// Explicitly set Node.js runtime for this route

// Explicitly set Node.js runtime for this route
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ message: 'Test route is working' });
}
