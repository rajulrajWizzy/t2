import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
): Promise<NextResponse> {
  try {
    // Get the path from the params
    const filePath = params.path.join('/');
    
    // Determine the actual file path on disk
    // First check the uploads directory at the project root
    let fullPath = path.join(process.cwd(), 'uploads', filePath);
    
    // If not found there, check in the public/uploads directory
    if (!fs.existsSync(fullPath)) {
      fullPath = path.join(process.cwd(), 'public', 'uploads', filePath);
    }
    
    // Check if the file exists
    if (!fs.existsSync(fullPath)) {
      console.error(`File not found: ${fullPath}`);
      return new NextResponse('File not found', { status: 404 });
    }
    
    // Read the file
    const fileBuffer = fs.readFileSync(fullPath);
    
    // Determine the content type based on file extension
    const ext = path.extname(fullPath).toLowerCase();
    let contentType = 'application/octet-stream'; // Default content type
    
    // Map common extensions to MIME types
    switch (ext) {
      case '.jpg':
      case '.jpeg':
        contentType = 'image/jpeg';
        break;
      case '.png':
        contentType = 'image/png';
        break;
      case '.gif':
        contentType = 'image/gif';
        break;
      case '.pdf':
        contentType = 'application/pdf';
        break;
      case '.svg':
        contentType = 'image/svg+xml';
        break;
      case '.webp':
        contentType = 'image/webp';
        break;
    }
    
    // Return the file with the appropriate content type
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400', // Cache for 1 day
      },
    });
  } catch (error) {
    console.error('Error serving static file:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 