<<<<<<< Updated upstream
 
=======
// Explicitly set Node.js runtime for this route
export const runtime = "nodejs";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/utils/jwt';
import models from '@/models';
import { ApiResponse } from '@/types/common';

/**
 * GET /api/profile/verification-status - Get user's verification status
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    // Verify authentication
    const auth = await verifyAuth(req);
    if ('status' in auth) {
      return auth as NextResponse;
    }
<<<<<<< Updated upstream
<<<<<<< Updated upstream
=======
=======

    // Get user ID from token
    const userId = auth.id;
    
    // Find the customer
    const customer = await models.Customer.findByPk(userId, {
      attributes: [
        'id',
        'name',
        'email',
        'proof_of_identity',
        'proof_of_address',
        'address',
        'is_identity_verified',
        'is_address_verified', 
        'verification_status',
        'verification_notes',
        'verification_date',
        'created_at'
      ]
    });
    
    if (!customer) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Customer not found',
        data: null
      }, { status: 404 });
    }
    
    // Check verification requirements
    const hasProofOfIdentity = !!customer.proof_of_identity;
    const hasProofOfAddress = !!customer.proof_of_address;
    const hasAddress = !!customer.address;
    const isComplete = hasProofOfIdentity && hasProofOfAddress && hasAddress;
    const canMakeBookings = isComplete && 
                           customer.verification_status === 'APPROVED' && 
                           customer.is_identity_verified && 
                           customer.is_address_verified;
    
    // Generate a user-friendly status message
    let statusMessage = '';
    let nextSteps = '';
    
    if (!isComplete) {
      statusMessage = 'Your profile is incomplete.';
      nextSteps = 'Please upload all required documents to proceed with verification.';
    } else if (customer.verification_status === 'PENDING') {
      statusMessage = 'Your documents have been submitted and are pending verification.';
      nextSteps = 'Our admin team will review your documents shortly. You will be notified once the verification is complete.';
    } else if (customer.verification_status === 'REJECTED') {
      statusMessage = 'Your verification was not approved.';
      nextSteps = customer.verification_notes || 'Please update your documents and try again.';
    } else if (customer.verification_status === 'APPROVED') {
      statusMessage = 'Your profile has been successfully verified.';
      nextSteps = 'You can now make bookings at any of our locations.';
    }
    
    return NextResponse.json<ApiResponse<any>>({
      success: true,
      message: 'Verification status retrieved successfully',
      data: {
        ...customer.toJSON(),
        documents_status: {
          proof_of_identity: hasProofOfIdentity,
          proof_of_address: hasProofOfAddress,
          address: hasAddress,
          is_complete: isComplete
        },
        can_make_bookings: canMakeBookings,
        status_message: statusMessage,
        next_steps: nextSteps,
        missing_documents: !isComplete ? {
          proof_of_identity: !hasProofOfIdentity,
          proof_of_address: !hasProofOfAddress,
          address: !hasAddress
        } : null
      }
    });
  } catch (error) {
    console.error('Error retrieving verification status:', error);
    
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Failed to retrieve verification status',
      data: null,
      error: (error as Error).message
    }, { status: 500 });
  }
}
>>>>>>> Stashed changes

    // Get user ID from token
    const userId = auth.id;
    
    // Find the customer
    const customer = await models.Customer.findByPk(userId, {
      attributes: [
        'id',
        'name',
        'email',
        'proof_of_identity',
        'proof_of_address',
        'address',
        'is_identity_verified',
        'is_address_verified', 
        'verification_status',
        'verification_notes',
        'verification_date',
        'created_at'
      ]
    });
    
    if (!customer) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Customer not found',
        data: null
      }, { status: 404 });
    }
    
    // Check verification requirements
    const hasProofOfIdentity = !!customer.proof_of_identity;
    const hasProofOfAddress = !!customer.proof_of_address;
    const hasAddress = !!customer.address;
    const isComplete = hasProofOfIdentity && hasProofOfAddress && hasAddress;
    const canMakeBookings = isComplete && 
                           customer.verification_status === 'APPROVED' && 
                           customer.is_identity_verified && 
                           customer.is_address_verified;
    
    // Generate a user-friendly status message
    let statusMessage = '';
    let nextSteps = '';
    
    if (!isComplete) {
      statusMessage = 'Your profile is incomplete.';
      nextSteps = 'Please upload all required documents to proceed with verification.';
    } else if (customer.verification_status === 'PENDING') {
      statusMessage = 'Your documents have been submitted and are pending verification.';
      nextSteps = 'Our admin team will review your documents shortly. You will be notified once the verification is complete.';
    } else if (customer.verification_status === 'REJECTED') {
      statusMessage = 'Your verification was not approved.';
      nextSteps = customer.verification_notes || 'Please update your documents and try again.';
    } else if (customer.verification_status === 'APPROVED') {
      statusMessage = 'Your profile has been successfully verified.';
      nextSteps = 'You can now make bookings at any of our locations.';
    }
    
    return NextResponse.json<ApiResponse<any>>({
      success: true,
      message: 'Verification status retrieved successfully',
      data: {
        ...customer.toJSON(),
        documents_status: {
          proof_of_identity: hasProofOfIdentity,
          proof_of_address: hasProofOfAddress,
          address: hasAddress,
          is_complete: isComplete
        },
        can_make_bookings: canMakeBookings,
        status_message: statusMessage,
        next_steps: nextSteps,
        missing_documents: !isComplete ? {
          proof_of_identity: !hasProofOfIdentity,
          proof_of_address: !hasProofOfAddress,
          address: !hasAddress
        } : null
      }
    });
  } catch (error) {
    console.error('Error retrieving verification status:', error);
    
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Failed to retrieve verification status',
      data: null,
      error: (error as Error).message
    }, { status: 500 });
  }
}
>>>>>>> Stashed changes

    // Get user ID from token
    const userId = auth.id;
    
    // Find the customer
    const customer = await models.Customer.findByPk(userId, {
      attributes: [
        'id',
        'name',
        'email',
        'proof_of_identity',
        'proof_of_address',
        'address',
        'is_identity_verified',
        'is_address_verified', 
        'verification_status',
        'verification_notes',
        'verification_date',
        'created_at'
      ]
    });
    
    if (!customer) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Customer not found',
        data: null
      }, { status: 404 });
    }
    
    // Check verification requirements
    const hasProofOfIdentity = !!customer.proof_of_identity;
    const hasProofOfAddress = !!customer.proof_of_address;
    const hasAddress = !!customer.address;
    const isComplete = hasProofOfIdentity && hasProofOfAddress && hasAddress;
    const canMakeBookings = isComplete && 
                           customer.verification_status === 'APPROVED' && 
                           customer.is_identity_verified && 
                           customer.is_address_verified;
    
    // Generate a user-friendly status message
    let statusMessage = '';
    let nextSteps = '';
    
    if (!isComplete) {
      statusMessage = 'Your profile is incomplete.';
      nextSteps = 'Please upload all required documents to proceed with verification.';
    } else if (customer.verification_status === 'PENDING') {
      statusMessage = 'Your documents have been submitted and are pending verification.';
      nextSteps = 'Our admin team will review your documents shortly. You will be notified once the verification is complete.';
    } else if (customer.verification_status === 'REJECTED') {
      statusMessage = 'Your verification was not approved.';
      nextSteps = customer.verification_notes || 'Please update your documents and try again.';
    } else if (customer.verification_status === 'APPROVED') {
      statusMessage = 'Your profile has been successfully verified.';
      nextSteps = 'You can now make bookings at any of our locations.';
    }
    
    return NextResponse.json<ApiResponse<any>>({
      success: true,
      message: 'Verification status retrieved successfully',
      data: {
        ...customer.toJSON(),
        documents_status: {
          proof_of_identity: hasProofOfIdentity,
          proof_of_address: hasProofOfAddress,
          address: hasAddress,
          is_complete: isComplete
        },
        can_make_bookings: canMakeBookings,
        status_message: statusMessage,
        next_steps: nextSteps,
        missing_documents: !isComplete ? {
          proof_of_identity: !hasProofOfIdentity,
          proof_of_address: !hasProofOfAddress,
          address: !hasAddress
        } : null
      }
    });
  } catch (error) {
    console.error('Error retrieving verification status:', error);
    
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Failed to retrieve verification status',
      data: null,
      error: (error as Error).message
    }, { status: 500 });
  }
}

>>>>>>> Stashed changes
