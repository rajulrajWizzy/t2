export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getUploadBasePath, getUploadedFilePath } from '@/utils/fileUpload';

// Map MIME types to file extensions
const mimeTypes: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain',
};

// Default cache control (1 day for most files)
const DEFAULT_CACHE = 'public, max-age=86400';

/**
 * Get file handler
 * This endpoint serves files from the uploads directory
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
): Promise<NextResponse> {
  try {
    // Ensure path is sanitized
    const filePath = params.path.join('/');
    
    // Prevent directory traversal
    if (filePath.includes('..') || filePath.includes('\\')) {
      return new NextResponse('Not Found', { status: 404 });
    }
    
    // Get the full path to the file
    const fullPath = getUploadedFilePath(filePath);
    
    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      return new NextResponse('Not Found', { status: 404 });
    }
    
    // Get file stats
    const stats = fs.statSync(fullPath);
    
    // If it's a directory, return 404
    if (stats.isDirectory()) {
      return new NextResponse('Not Found', { status: 404 });
    }
    
    // Read the file
    const fileBuffer = fs.readFileSync(fullPath);
    
    // Get MIME type based on file extension
    const ext = path.extname(fullPath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    
    // Set caching headers
    let cacheControl = DEFAULT_CACHE;
    
    // For sensitive documents, use stricter cache control
    if (filePath.startsWith('proof-of-') || filePath.includes('proof-of-')) {
      cacheControl = 'private, no-cache, no-store, must-revalidate';
    }
    
    // Return the file with appropriate headers
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': stats.size.toString(),
        'Cache-Control': cacheControl,
      },
    });
  } catch (error) {
    console.error('Error serving file:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 