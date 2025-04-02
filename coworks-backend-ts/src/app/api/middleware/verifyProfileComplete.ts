// Explicitly set Node.js runtime for this route
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";


import { NextRequest, NextResponse } from 'next/server';
import models from '@/models';
import { verifyToken } from '@/config/jwt';
import { ApiResponse } from '@/types/common';

/**
 * Middleware to verify if customer profile is complete with proof of identity, 
 * proof of address and address before allowing access to protected routes
 */
export async function verifyProfileComplete(request: NextRequest): Promise<NextResponse | null> {
  try {
    // Get token from the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Unauthorized',
        data: null
      }, { status: 401 });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify the token
    const { valid, decoded } = await verifyToken(token);
    if (!valid || !decoded) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Unauthorized',
        data: null
      }, { status: 401 });
    }
    
    // Find the customer
    const customer = await models.Customer.findByPk(decoded.id);
    if (!customer) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Customer not found',
        data: null
      }, { status: 404 });
    }
    
    // If verification status is APPROVED, allow access regardless of missing documents
    if (customer.verification_status === 'APPROVED') {
      // If profile is verified by admin, allow the request to proceed
      return null;
    }
    
    // Check if verification is rejected by admin
    if (customer.verification_status === 'REJECTED') {
      let message = 'Your profile verification was rejected. Please update your information and try again. ';
      if (customer.verification_notes) {
        message += `Reason: ${customer.verification_notes}`;
      }
      
      return NextResponse.json<ApiResponse<any>>({
        success: false,
        message,
        data: {
          verification_status: customer.verification_status,
          is_identity_verified: customer.is_identity_verified,
          is_address_verified: customer.is_address_verified,
          verification_notes: customer.verification_notes,
          verification_date: customer.verification_date
        }
      }, { status: 403 });
    }
    
    // For PENDING status, check if profile is complete with required documents
    const missingFields: Record<string, boolean> = {};
    let isProfileIncomplete = false;

    if (!customer.proof_of_identity) {
      missingFields.proof_of_identity = true;
      isProfileIncomplete = true;
    }
    
    if (!customer.proof_of_address) {
      missingFields.proof_of_address = true;
      isProfileIncomplete = true;
    }
    
    if (!customer.address) {
      missingFields.address = true;
      isProfileIncomplete = true;
    }

    if (isProfileIncomplete) {
      return NextResponse.json<ApiResponse<any>>({
        success: false,
        message: 'Profile verification incomplete. Please complete your profile with proof of identity, proof of address, and address before proceeding.',
        data: {
          missingFields,
          verification_status: customer.verification_status
        }
      }, { status: 403 });
    }
    
    // If profile is complete but still pending verification, show appropriate message
    if (customer.verification_status === 'PENDING') {
      return NextResponse.json<ApiResponse<any>>({
        success: false,
        message: 'Your profile is awaiting verification by our team. You will be able to make bookings once your profile is verified.',
        data: {
          verification_status: customer.verification_status
        }
      }, { status: 403 });
    }
    
    // If we reach here, allow the request to proceed
    return null;
  } catch (error) {
    console.error('Error verifying profile completeness:', error);
    
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Failed to verify profile',
      data: null,
      error: (error as Error).message
    }, { status: 500 });
  }
}