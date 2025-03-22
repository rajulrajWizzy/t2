import { NextRequest, NextResponse } from 'next/server';
import { uploadProfilePicture, uploadProofDocument } from '@/utils/cloudinary';
import { verifyAuth } from '@/utils/jwt';
import models from '@/models';

/**
 * Upload a profile picture or proof documents via Cloudinary
 * @param req Request object
 * @returns Response with the uploaded file URL
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
    
    // Get document type (profile_picture, proof_of_identity, or proof_of_address)
    const documentType = formData.get('document_type')?.toString();
    
    if (!documentType) {
      return NextResponse.json({ 
        success: false, 
        message: 'Document type is required (profile_picture, proof_of_identity, or proof_of_address)' 
      }, { status: 400 });
    }
    
    // Validate document type
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
      // Check file type and size
      const maxSizeInBytes = 5 * 1024 * 1024; // 5MB
      
      if (file.size > maxSizeInBytes) {
        return NextResponse.json({ 
          success: false, 
          message: 'File size exceeds 5MB limit' 
        }, { status: 400 });
      }
      
      // Validate file type based on document type
      let uploadResult;
      
      if (documentType === 'profile_picture') {
        // Only allow images for profile picture
        if (!file.type.startsWith('image/')) {
          return NextResponse.json({ 
            success: false, 
            message: 'Profile picture must be an image file (JPG, JPEG, PNG)' 
          }, { status: 400 });
        }
        
        uploadResult = await uploadProfilePicture(file);
      } else {
        // For proof documents, allow PDF, JPG, JPEG, PNG
        if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
          return NextResponse.json({ 
            success: false, 
            message: 'Proof documents must be PDF, JPG, JPEG, or PNG files' 
          }, { status: 400 });
        }
        
        uploadResult = await uploadProofDocument(file, documentType);
      }
      
      // Find the customer by ID
      const customer = await models.Customer.findByPk(userId);
      if (!customer) {
        return NextResponse.json({ 
          success: false, 
          message: 'Customer not found' 
        }, { status: 404 });
      }
      
      // Update the customer model with the URL of the uploaded file
      if (documentType === 'profile_picture') {
        await customer.update({ profile_picture: uploadResult.secure_url });
      } else if (documentType === 'proof_of_identity') {
        await customer.update({ proof_of_identity: uploadResult.secure_url });
      } else if (documentType === 'proof_of_address') {
        await customer.update({ proof_of_address: uploadResult.secure_url });
      }
      
      return NextResponse.json({ 
        success: true, 
        message: 'File uploaded successfully',
        data: {
          url: uploadResult.secure_url,
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