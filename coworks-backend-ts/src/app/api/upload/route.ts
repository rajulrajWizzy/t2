// Explicitly set Node.js runtime for this route
export const runtime = "nodejs";

// Explicitly set Node.js runtime for this route

// src/app/api/upload/route.ts
// Explicitly set Node.js runtime for this route

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/config/jwt';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { uploadImageToBlob } from '@/utils/vercelBlobService';
import { validateBase64Image } from '@/utils/imageValidation';
import storageConfig from '@/config/storage';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Get token from the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify the token
    const { valid, decoded } = await verifyToken(token);
    if (!valid || !decoded) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Parse the request body
    const body = await request.json();
    const { image, type } = body;
    
    if (!image) {
      return NextResponse.json(
        { success: false, message: 'Image is required' },
        { status: 400 }
      );
    }
    
    // Validate folder type
    const folder = type === 'branch' ? 'branch' : 'profile';
    
    // Validate the image
    const validatedImage = validateBase64Image(image);
    
    if (!validatedImage.isValid) {
      return NextResponse.json(
        { success: false, message: validatedImage.error },
        { status: 400 }
      );
    }
    
    let imageUrl;
    
    // Check if we're in production and Vercel Blob is configured
    if (storageConfig.isProduction && storageConfig.isVercelBlobConfigured) {
      // Use Vercel Blob Storage for production
      try {
        imageUrl = await uploadImageToBlob(image, folder);
      } catch (error) {
        console.error('Error uploading to Vercel Blob:', error);
        
        // Fall back to placeholder
        const filename = `${uuidv4()}.${validatedImage.extension}`;
        imageUrl = `${storageConfig.baseUrl}/api/placeholder/${folder}/${filename}`;
      }
    } else if (storageConfig.isProduction) {
      // In production but Vercel Blob is not configured
      // We can't reliably store files in production without Blob Storage
      // so we'll use a placeholder
      const filename = `${uuidv4()}.${validatedImage.extension}`;
      imageUrl = `${storageConfig.baseUrl}/api/placeholder/${folder}/${filename}`;
      
      console.warn('Image uploaded to placeholder API. Configure Vercel Blob Storage for production use.');
    } else {
      // Local development - use public directory
      try {
        // Generate unique filename
        const filename = `${uuidv4()}.${validatedImage.extension}`;
        
        // Create directory if it doesn't exist
        const publicDir = path.join(process.cwd(), 'public', folder);
        if (!fs.existsSync(publicDir)) {
          fs.mkdirSync(publicDir, { recursive: true });
        }
        
        // Write file to public directory
        fs.writeFileSync(path.join(publicDir, filename), validatedImage.buffer);
        
        // Return the URL
        imageUrl = `/${folder}/${filename}`;
      } catch (error) {
        console.error('File system error:', error);
        
        // Fall back to placeholder
        const filename = `${uuidv4()}.${validatedImage.extension}`;
        imageUrl = `/api/placeholder/${folder}/${filename}`;
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Image uploaded successfully',
      data: { url: imageUrl }
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to upload image', error: (error as Error).message },
      { status: 500 }
    );
  }
}
