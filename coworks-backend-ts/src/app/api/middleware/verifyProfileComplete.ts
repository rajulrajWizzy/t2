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
    
    // Check if profile is complete
    if (!customer.proof_of_identity || !customer.proof_of_address || !customer.address) {
      return NextResponse.json<ApiResponse<any>>({
        success: false,
        message: 'Profile verification incomplete. Please complete your profile with proof of identity, proof of address, and address before proceeding.',
        data: {
          missingFields: {
            proof_of_identity: !customer.proof_of_identity,
            proof_of_address: !customer.proof_of_address,
            address: !customer.address
          }
        }
      }, { status: 403 });
    }
    
    // If profile is complete, return null to allow the request to proceed
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