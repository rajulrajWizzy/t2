// Use Node.js runtime for Cloudinary integration
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { uploadImage } from '@/config/cloudinary';
import { verifyToken } from '@/utils/jwt';
import { appendFile } from 'fs/promises';
import { join } from 'path';

/**
 * Handles image upload to Cloudinary
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Get token from the authorization header
    const authHeader = request.headers.get('Authorization');
    
    // Check if header exists and has correct format
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Invalid authorization header format' },
        { status: 401 }
      );
    }
    
    const token = authHeader.replace('Bearer ', '');
    
    // Ensure token is not empty
    if (!token || token.trim() === '') {
      return NextResponse.json(
        { success: false, message: 'Authentication token is missing' },
        { status: 401 }
      );
    }
    
    // Verify the token
    const { valid, decoded } = await verifyToken(token);
    
    if (!valid || !decoded) {
      return NextResponse.json(
        { success: false, message: 'Invalid or expired token' },
        { status: 401 }
      );
    }
    
    try {
      const formData = await request.formData();
      const file = formData.get('file');
      const folder = formData.get('folder') as string || 'coworks';
      
      if (!file) {
        return NextResponse.json(
          { success: false, message: 'No file uploaded' },
          { status: 400 }
        );
      }
      
      let fileData: string;
      
      if (file instanceof File) {
        // Convert File to base64
        const buffer = await file.arrayBuffer();
        fileData = `data:${file.type};base64,${Buffer.from(buffer).toString('base64')}`;
      } else if (typeof file === 'string') {
        // Already a string (URL or base64)
        fileData = file;
      } else {
        return NextResponse.json(
          { success: false, message: 'Invalid file format' },
          { status: 400 }
        );
      }
      
      // Upload to Cloudinary
      const result = await uploadImage(fileData, folder);
      
      // Log upload for admin purposes
      try {
        const logEntry = `${new Date().toISOString()} - User ${decoded.id} uploaded image: ${result.publicId}\n`;
        await appendFile(join(process.cwd(), 'logs', 'uploads.log'), logEntry);
      } catch (logError) {
        console.error('Error writing to upload log:', logError);
        // Non-critical error, continue
      }
      
      return NextResponse.json({
        success: true,
        message: 'File uploaded successfully',
        data: result
      });
    } catch (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json(
        { success: false, message: 'Error processing upload', error: (uploadError as Error).message },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error', error: (error as Error).message },
      { status: 500 }
    );
  }
} 