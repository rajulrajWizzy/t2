// src/app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/utils/jwt';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { uploadImageToBlob } from '@/utils/vercelBlobService';
import { validateBase64Image } from '@/utils/imageValidation';
import storageConfig from '@/config/storage';
import { ApiResponse } from '@/types/common';
import { saveBase64Image, UploadType } from '@/utils/fileUpload';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/**
 * Upload file endpoint
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.file || !body.type) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'File and type are required',
        error: 'VALIDATION_ERROR',
        data: null
      }, { status: 400, headers: corsHeaders });
    }
    
    // Validate upload type
    const validTypes: UploadType[] = [
      'profile-picture',
      'branch-image',
      'proof-of-identity',
      'proof-of-address'
    ];
    
    if (!validTypes.includes(body.type as UploadType)) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: `Invalid upload type. Must be one of: ${validTypes.join(', ')}`,
        error: 'VALIDATION_ERROR',
        data: null
      }, { status: 400, headers: corsHeaders });
    }
    
    // Process and save the file
    try {
      const filePath = await saveBase64Image(
        body.file,
        body.type as UploadType,
        body.customFilename
      );
      
      return NextResponse.json<ApiResponse<{ filePath: string }>>({
        success: true,
        message: 'File uploaded successfully',
        data: { filePath }
      }, { status: 200, headers: corsHeaders });
    } catch (uploadError) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: (uploadError as Error).message,
        error: 'UPLOAD_ERROR',
        data: null
      }, { status: 400, headers: corsHeaders });
    }
  } catch (error) {
    console.error('File upload error:', error);
    
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'An error occurred during file upload',
      error: (error as Error).message,
      data: null
    }, { status: 500, headers: corsHeaders });
  }
<<<<<<< Updated upstream
}
<<<<<<< Updated upstream
<<<<<<< Updated upstream
=======
}
=======
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes

/**
 * Handle OPTIONS request for CORS
 */
export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders
  });
}
<<<<<<< Updated upstream
<<<<<<< Updated upstream
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
