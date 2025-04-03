// Explicitly set Node.js runtime for this route
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/utils/jwt';
import { verifyAdmin } from '@/utils/adminAuth';
import models from '@/models';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify admin authentication
    const auth = await verifyAdmin(request);
    
    // Get user ID from params
    const userId = params.id;
    
    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        message: 'User ID is required' 
      }, { status: 400 });
    }
    
    // Parse request body
    const body = await request.json();
    const { documentType, approve, rejectionReason } = body;
    
    // Validate required fields
    if (!documentType) {
      return NextResponse.json({ 
        success: false, 
        message: 'documentType is required' 
      }, { status: 400 });
    }
    
    // Validate document type
    if (documentType !== 'identity' && documentType !== 'address') {
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid documentType. Must be either "identity" or "address"' 
      }, { status: 400 });
    }
    
    // If rejecting, require a reason
    if (approve === false && !rejectionReason) {
      return NextResponse.json({ 
        success: false, 
        message: 'Rejection reason is required when rejecting a document' 
      }, { status: 400 });
    }
    
    try {
      // Check if database is connected
      try {
        await models.sequelize.authenticate();
        console.log('Database connection is active');
      } catch (dbConnectionError) {
        console.error('Database connection failed:', dbConnectionError);
        throw new Error('Database connection failed: ' + (dbConnectionError as Error).message);
      }
      
      // Find the customer
      const customer = await models.Customer.findByPk(userId);
      
      if (!customer) {
        return NextResponse.json({ 
          success: false, 
          message: 'User not found' 
        }, { status: 404 });
      }
      
      // Update the verification status based on document type
      const updateData: any = {};
      
      if (documentType === 'identity') {
        updateData.is_identity_verified = approve;
      } else {
        updateData.is_address_verified = approve;
      }
      
      // If rejecting, update rejection reason and overall status
      if (!approve) {
        updateData.verification_status = 'REJECTED';
        updateData.rejection_reason = rejectionReason;
      } else {
        // If approving, check if both documents are now verified
        const isIdentityVerified = documentType === 'identity' ? true : customer.is_identity_verified;
        const isAddressVerified = documentType === 'address' ? true : customer.is_address_verified;
        
        if (isIdentityVerified && isAddressVerified) {
          updateData.verification_status = 'VERIFIED';
        }
      }
      
      // Update the customer
      await customer.update(updateData);
      
      // Return success response
      return NextResponse.json({ 
        success: true, 
        message: `Document ${approve ? 'approved' : 'rejected'} successfully`,
        data: {
          id: customer.id,
          verification_status: customer.verification_status,
          is_identity_verified: customer.is_identity_verified,
          is_address_verified: customer.is_address_verified
        }
      });
    } catch (dbError) {
      console.error('Database error in POST /api/admin/users/[userId]/verify-document:', dbError);
      
      // Return error response
      return NextResponse.json({ 
        success: false, 
        message: 'Failed to update user verification: ' + (dbError as Error).message,
        error: (dbError as Error).stack
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in POST /api/admin/users/[userId]/verify-document:', error);
    
    // Return error response
    return NextResponse.json({ 
      success: false, 
      message: 'Server error: ' + (error as Error).message 
    }, { status: 500 });
  }
}
