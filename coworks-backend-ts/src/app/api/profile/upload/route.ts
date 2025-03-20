import { NextRequest, NextResponse } from 'next/server';
import { uploadProfilePicture } from '@/utils/cloudinary';
import { verifyAuth } from '@/utils/jwt';
import models from '@/models';

/**
 * Upload a profile picture via Cloudinary
 * @param req Request object
 * @returns Response with the profile picture URL
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

    // Check if user exists
    const [customer] = await models.Customer.findAll({
      where: { id: userId }
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Parse form data
    const formData = await req.formData();
    const file = formData.get('image') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, message: 'No image file provided' },
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

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, message: 'Image size exceeds 5MB limit' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload to Cloudinary
    const imageUrl = await uploadProfilePicture(buffer, userId);

    // Update user profile
    await models.Customer.update(
      { profile_picture: imageUrl },
      { where: { id: userId } }
    );

    return NextResponse.json({
      success: true,
      message: 'Profile picture uploaded successfully',
      data: { profile_picture: imageUrl }
    });
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to upload profile picture' },
      { status: 500 }
    );
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

    return NextResponse.json({
      success: true,
      message: 'Profile picture updated successfully',
      data: { profile_picture }
    });
  } catch (error) {
    console.error('Error updating profile picture:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update profile picture' },
      { status: 500 }
    );
  }
} 