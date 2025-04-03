// Explicitly set Node.js runtime for this route
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/utils/jwt';
import { verifyAdmin } from '@/utils/adminAuth';
import models from '@/models';
import { Op } from 'sequelize';

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const auth = await verifyAdmin(request);
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'PENDING';
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;
    
    // Try to fetch data from database, with fallback to mock data
    try {
      // Check if database is connected
      try {
        await models.sequelize.authenticate();
        console.log('Database connection is active');
      } catch (dbConnectionError) {
        console.error('Database connection failed:', dbConnectionError);
        throw new Error('Database connection failed: ' + (dbConnectionError as Error).message);
      }
      
      // Construct where clause
      const whereClause: any = {};
      
      // Filter by verification status if provided
      if (status !== 'ALL') {
        whereClause.verification_status = status;
      }
      
      // Add search filter if provided
      if (search) {
        whereClause[Op.or] = [
          { name: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } },
          { phone: { [Op.like]: `%${search}%` } }
        ];
      }
      
      // Log the query we're about to execute
      console.log('Executing verification query with where clause:', JSON.stringify(whereClause));
      
      // Execute the query
      const customers = await models.Customer.findAndCountAll({
        where: whereClause,
        attributes: [
          'id', 
          'name', 
          'email', 
          'phone', 
          'profile_picture',
          'proof_of_identity',
          'proof_of_address',
          'verification_status',
          'is_identity_verified',
          'is_address_verified',
          'created_at',
          'updated_at'
        ],
        limit,
        offset,
        order: [['created_at', 'DESC']]
      });
      
      // Format the response
      const users = customers.rows.map((customer: any) => ({
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        profile_picture: customer.profile_picture,
        proof_of_identity: customer.proof_of_identity,
        proof_of_address: customer.proof_of_address,
        verification_status: customer.verification_status,
        is_identity_verified: customer.is_identity_verified,
        is_address_verified: customer.is_address_verified,
        created_at: customer.created_at,
        updated_at: customer.updated_at
      }));
      
      // Return the data
      return NextResponse.json({ 
        success: true, 
        data: users,
        total: customers.count,
        page,
        limit
      });
    } catch (dbError) {
      console.error('Database error in GET /api/admin/users/verification:', dbError);
      
      // Return error response
      return NextResponse.json({ 
        success: false, 
        message: 'Failed to fetch users for verification: ' + (dbError as Error).message,
        error: (dbError as Error).stack
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in GET /api/admin/users/verification:', error);
    
    // Return error response
    return NextResponse.json({ 
      success: false, 
      message: 'Server error: ' + (error as Error).message 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const auth = await verifyAdmin(request);
    
    // Parse request body
    const body = await request.json();
    const { userId, documentType, approve, rejectionReason } = body;
    
    // Validate required fields
    if (!userId || !documentType) {
      return NextResponse.json({ 
        success: false, 
        message: 'Missing required fields: userId and documentType are required' 
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
    if (!approve && !rejectionReason) {
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
      console.error('Database error in POST /api/admin/users/verification:', dbError);
      
      // Return error response
      return NextResponse.json({ 
        success: false, 
        message: 'Failed to update user verification: ' + (dbError as Error).message,
        error: (dbError as Error).stack
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in POST /api/admin/users/verification:', error);
    
    // Return error response
    return NextResponse.json({ 
      success: false, 
      message: 'Server error: ' + (error as Error).message 
    }, { status: 500 });
  }
}
