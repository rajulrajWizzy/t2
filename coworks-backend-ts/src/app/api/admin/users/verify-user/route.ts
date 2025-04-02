import { NextRequest, NextResponse } from 'next/server';
import models from '@/models';
import { corsHeaders } from '@/utils/jwt-wrapper';
import { requireAdmin } from '@/app/api/middleware/requireRole';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

/**
 * POST /api/admin/users/verify-user - Manually verify a customer by email (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    // Apply admin middleware
    const middleware = requireAdmin();
    const middlewareResponse = await middleware(request);
    if (middlewareResponse.status !== 200) {
      return middlewareResponse;
    }

    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, message: 'Email is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Find user by email
    const user = await models.Customer.findOne({
      where: { email }
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    // If user is already verified
    if (user.verification_status === 'APPROVED' && user.is_identity_verified && user.is_address_verified) {
      return NextResponse.json(
        { 
          success: true, 
          message: 'User is already verified',
          data: {
            user: {
              id: user.id,
              email: user.email,
              verification_status: user.verification_status,
              is_identity_verified: user.is_identity_verified,
              is_address_verified: user.is_address_verified
            }
          }
        },
        { status: 200, headers: corsHeaders }
      );
    }

    // Update user verification status
    await user.update({ 
      verification_status: 'APPROVED',
      is_identity_verified: true,
      is_address_verified: true,
      verification_date: new Date(),
      verified_by: (request as any).user.id
    });

    return NextResponse.json(
      { 
        success: true, 
        message: 'User verified successfully',
        data: {
          user: {
            id: user.id,
            email: user.email,
            verification_status: 'APPROVED',
            is_identity_verified: true,
            is_address_verified: true
          }
        }
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('Error verifying user:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to verify user' },
      { status: 500, headers: corsHeaders }
    );
  }
}

// OPTIONS handler for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders
  });
} 