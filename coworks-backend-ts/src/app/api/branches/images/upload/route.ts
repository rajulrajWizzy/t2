// Explicitly set Node.js runtime for this route
export const runtime = "nodejs";

// Explicitly set Node.js runtime for this route

// Explicitly set Node.js runtime for this route

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/utils/jwt';
import models from '@/models';
import { Op } from 'sequelize';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

/**
 * Upload a branch image to the local file system
 * @param req Request object
 * @returns Response with the branch image URL
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Verify authentication
    const auth = await verifyAuth(req);
    if ('status' in auth) {
      return auth as NextResponse;
    }

    // Parse form data
    const formData = await req.formData();
    const file = formData.get('image') as File;
    const branchId = formData.get('branch_id') as string;
    const seatingType = formData.get('seating_type') as string;
    const isPrimary = formData.get('is_primary') === 'true';
    const index = parseInt(formData.get('index') as string || '1', 10);

    // Validate required fields
    if (!file || !branchId || !seatingType) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields: image, branch_id, and seating_type are required' },
        { status: 400 }
      );
    }

    // Validate branch exists
    const branch = await models.Branch.findByPk(branchId);
    if (!branch) {
      return NextResponse.json(
        { success: false, message: 'Branch not found' },
        { status: 404 }
      );
    }

    // Validate seating type
    const validSeatingTypes = [
      'HOT_DESK', 'DEDICATED_DESK', 'MEETING_ROOM', 
      'CUBICLE_3', 'CUBICLE_4', 'CUBICLE_6', 'CUBICLE_10', 
      'DAILY_PASS', 'DEFAULT'
    ];
    
    if (!validSeatingTypes.includes(seatingType)) {
      return NextResponse.json(
        { success: false, message: 'Invalid seating type' },
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, message: 'Invalid file type. Only JPG and PNG are allowed' },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, message: 'Image size exceeds 10MB limit' },
        { status: 400 }
      );
    }

    try {
      // Determine file extension from MIME type
      let fileExtension = '.jpg'; // Default
      if (file.type === 'image/png') {
        fileExtension = '.png';
      } else if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
        fileExtension = '.jpg';
      }
      
      // Create directory if it doesn't exist
      const dirName = 'branch-images';
      const uploadDir = path.join(process.cwd(), 'uploads', dirName, branchId.toString(), seatingType.toLowerCase());
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      // Generate a unique filename
      const filename = `${uuidv4()}${fileExtension}`;
      const filePath = path.join(uploadDir, filename);
      
      // Save the file
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      fs.writeFileSync(filePath, buffer);
      
      // Create a relative URL to the file for database storage
      const relativeUrl = `${dirName}/${branchId}/${seatingType.toLowerCase()}/${filename}`;
      
      // If marked as primary, unset any other primary images for this branch/seating type
      if (isPrimary) {
        await models.BranchImage.update(
          { is_primary: false },
          {
            where: {
              branch_id: branchId,
              seating_type: seatingType,
              is_primary: true
            }
          }
        );
      }

      // Save image to database
      const branchImage = await models.BranchImage.create({
        branch_id: branchId,
        image_url: relativeUrl,
        is_primary: isPrimary,
        seating_type: seatingType
      });

      // Generate the full URL for the response
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                    `${req.headers.get('x-forwarded-proto') || 'http'}://${req.headers.get('host')}`;
      const fullUrl = `${baseUrl}/uploads/${relativeUrl}`;

      return NextResponse.json({
        success: true,
        message: 'Branch image uploaded successfully',
        data: {
          id: branchImage.id,
          branch_id: branchId,
          image_url: fullUrl,
          relative_path: relativeUrl,
          is_primary: isPrimary,
          seating_type: seatingType
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
    console.error('Error uploading branch image:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to upload branch image' },
      { status: 500 }
    );
  }
}

/**
 * Update branch image settings
 */
export async function PATCH(req: NextRequest): Promise<NextResponse> {
  try {
    // Verify authentication
    const auth = await verifyAuth(req);
    if ('status' in auth) {
      return auth as NextResponse;
    }

    // Parse request body
    const { image_id, is_primary } = await req.json();

    // Validate required fields
    if (!image_id || typeof is_primary !== 'boolean') {
      return NextResponse.json(
        { success: false, message: 'image_id and is_primary are required' },
        { status: 400 }
      );
    }

    // Find the image
    const branchImage = await models.BranchImage.findByPk(image_id);
    if (!branchImage) {
      return NextResponse.json(
        { success: false, message: 'Branch image not found' },
        { status: 404 }
      );
    }

    // If setting as primary, unset any other primary images for this branch/seating type
    if (is_primary) {
      await models.BranchImage.update(
        { is_primary: false },
        {
          where: {
            branch_id: branchImage.branch_id,
            seating_type: branchImage.seating_type,
            is_primary: true,
            id: { [Op.ne]: image_id }
          }
        }
      );
    }

    // Update the image
    branchImage.is_primary = is_primary;
    await branchImage.save();

    // Generate the full URL for the response if it's a relative path
    let fullUrl = branchImage.image_url;
    if (!branchImage.image_url.startsWith('http')) {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                    `${req.headers.get('x-forwarded-proto') || 'http'}://${req.headers.get('host')}`;
      fullUrl = `${baseUrl}/uploads/${branchImage.image_url.replace(/^\/?uploads\//, '')}`;
    }

    return NextResponse.json({
      success: true,
      message: 'Branch image updated successfully',
      data: {
        id: branchImage.id,
        branch_id: branchImage.branch_id,
        image_url: fullUrl,
        is_primary: branchImage.is_primary,
        seating_type: branchImage.seating_type
      }
    });
  } catch (error) {
    console.error('Error updating branch image:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update branch image' },
      { status: 500 }
    );
  }
}

/**
 * Delete a branch image
 */
export async function DELETE(req: NextRequest): Promise<NextResponse> {
  try {
    // Verify authentication
    const auth = await verifyAuth(req);
    if ('status' in auth) {
      return auth as NextResponse;
    }

    // Get query parameters
    const url = new URL(req.url);
    const imageId = url.searchParams.get('id');

    if (!imageId) {
      return NextResponse.json(
        { success: false, message: 'Image ID is required' },
        { status: 400 }
      );
    }

    // Find the image
    const branchImage = await models.BranchImage.findByPk(imageId);
    if (!branchImage) {
      return NextResponse.json(
        { success: false, message: 'Branch image not found' },
        { status: 404 }
      );
    }

    // Try to delete the actual file if it's a local file
    if (!branchImage.image_url.startsWith('http')) {
      try {
        const filePath = path.join(process.cwd(), 'uploads', branchImage.image_url);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (err) {
        console.error('Error deleting branch image file:', err);
        // Continue with deletion from database even if file deletion fails
      }
    }

    // Delete the image from database
    await branchImage.destroy();

    return NextResponse.json({
      success: true,
      message: 'Branch image deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting branch image:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete branch image' },
      { status: 500 }
    );
  }
} 
