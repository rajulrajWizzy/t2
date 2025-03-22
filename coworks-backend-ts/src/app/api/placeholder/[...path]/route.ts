// Explicitly set Node.js runtime for this route
export const runtime = "nodejs";

// src/app/api/placeholder/[...path]/route.ts
import { NextRequest, NextResponse } from 'next/server';

// This route will serve placeholder images for local development
export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
): Promise<NextResponse> {
  try {
    const { path } = params;
    
    // Generate SVG placeholder image
    const width = 400;
    const height = 400;
    const text = path.join('/');
    
    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#f0f0f0"/>
        <text x="50%" y="50%" font-family="Arial" font-size="20" text-anchor="middle">${text}</text>
      </svg>
    `;
    
    // Return the SVG image
    return new NextResponse(svg, {
      headers: {
        'Content-Type': 'image/svg+xml'
      }
    });
  } catch (error) {
    console.error('Error generating placeholder image:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to generate placeholder' },
      { status: 500 }
    );
  }
}