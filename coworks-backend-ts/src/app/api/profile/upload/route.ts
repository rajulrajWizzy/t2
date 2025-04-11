// Explicitly set Node.js runtime for this route
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/utils/jwt';
import models from '@/models';
import path from 'path';
import fs from 'fs';
import { Buffer } from 'buffer';

/**
 * Utility to add timestamp to filenames
 */
function getTimestampSuffix() {
  const now = new Date();
  return `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}`;
}

/**
 * Upload a profile picture or proof documents to the local file system
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Verify authentication
    const auth = await verifyAuth(req);
    if ('status' in auth) {
      return auth as NextResponse;
    }

    // Get user ID from token
    const userId = auth.id;

    // Get the form data
    const formData = await req.formData();

    // Get document type
    const documentType = formData.get('document_type')?.toString();

    if (!documentType) {
      return NextResponse.json({
        success: false,
        message: 'Document type is required (profile_picture, proof_of_identity, or proof_of_address)'
      }, { status: 400 });
    }

    if (!['profile_picture', 'proof_of_identity', 'proof_of_address'].includes(documentType)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid document type. Must be one of: profile_picture, proof_of_identity, or proof_of_address'
      }, { status: 400 });
    }

    // Get file from formData
    const file = formData.get('file');
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({
        success: false,
        message: 'File is required'
      }, { status: 400 });
    }

    try {
      // Check file size
      const maxSizeInBytes = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSizeInBytes) {
        return NextResponse.json({
          success: false,
          message: 'File size exceeds 5MB limit'
        }, { status: 400 });
      }

      // Validate file type
      if (documentType === 'profile_picture' && !file.type.startsWith('image/')) {
        return NextResponse.json({
          success: false,
          message: 'Profile picture must be an image file (JPG, JPEG, PNG)'
        }, { status: 400 });
      }

      if (documentType !== 'profile_picture' && !file.type.startsWith('image/') && file.type !== 'application/pdf') {
        return NextResponse.json({
          success: false,
          message: 'Proof documents must be PDF, JPG, JPEG, or PNG files'
        }, { status: 400 });
      }

      // Extract original name and sanitize
      const originalName = (file as File).name || 'upload';
      const nameParts = originalName.split('.');
      const baseName = nameParts.slice(0, -1).join('.') || 'file';
      const ext = '.' + nameParts.pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
      const sanitizedBase = baseName.replace(/[^a-zA-Z0-9_-]/g, '_');
      const timestamp = getTimestampSuffix();
      const finalFileName = `${sanitizedBase}_${timestamp}${ext}`;

      // Replace underscores with hyphens in document type for directory name
      const dirName = documentType.replace(/_/g, '-') + 's';

      // Create directory under public/uploads
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', dirName, userId.toString());
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const filePath = path.join(uploadDir, finalFileName);
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      fs.writeFileSync(filePath, buffer);

      // Relative and full URL
      const relativeUrl = `uploads/${dirName}/${userId}/${finalFileName}`;
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `${req.headers.get('x-forwarded-proto') || 'http'}://${req.headers.get('host')}`;
      const fullUrl = `${baseUrl}/${relativeUrl}`;

      // Find and update customer
      const customer = await models.Customer.findByPk(userId);
      if (!customer) {
        return NextResponse.json({
          success: false,
          message: 'Customer not found'
        }, { status: 404 });
      }

      if (documentType === 'profile_picture') {
        await customer.update({ profile_picture: relativeUrl });
      } else if (documentType === 'proof_of_identity') {
        await customer.update({ proof_of_identity: relativeUrl });
      } else if (documentType === 'proof_of_address') {
        await customer.update({ proof_of_address: relativeUrl });
      }

      return NextResponse.json({
        success: true,
        message: 'File uploaded successfully',
        data: {
          url: fullUrl,
          relative_path: relativeUrl,
          document_type: documentType
        }
      });

    } catch (error) {
      console.error('Error processing file upload:', error);
      return NextResponse.json({
        success: false,
        message: 'Error processing file upload',
        error: (error as Error).message
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in upload route:', error);
    return NextResponse.json({
      success: false,
      message: 'Error in upload route',
      error: (error as Error).message
    }, { status: 500 });
  }
}

/**
 * Update profile picture settings
 */
export async function PATCH(req: NextRequest): Promise<NextResponse> {
  try {
    // Verify authentication
    const auth = await verifyAuth(req);
    if ('status' in auth) {
      return auth as NextResponse;
    }

    // Get user ID from token
    const userId = auth.id;

    // Parse request body
    const { profile_picture } = await req.json();

    // Validate profile_picture URL
    if (!profile_picture || typeof profile_picture !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Valid profile picture URL is required' },
        { status: 400 }
      );
    }

    // Update user profile
    const [updated] = await models.Customer.update(
      { profile_picture },
      { where: { id: userId } }
    );

    if (updated === 0) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Generate the full URL for the response if it's a relative path
    let fullUrl = profile_picture;
    if (!profile_picture.startsWith('http')) {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ||
        `${req.headers.get('x-forwarded-proto') || 'http'}://${req.headers.get('host')}`;
      fullUrl = `${baseUrl}/uploads/${profile_picture.replace(/^\/?uploads\//, '')}`;
    }

    return NextResponse.json({
      success: true,
      message: 'Profile picture updated successfully',
      data: {
        profile_picture: fullUrl,
        relative_path: profile_picture
      }
    });
  } catch (error) {
    console.error('Error updating profile picture:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update profile picture' },
      { status: 500 }
    );
  }
}
