// Explicitly set Node.js runtime for this route
export const runtime = "nodejs";

// Explicitly set Node.js runtime for this route

// Explicitly set Node.js runtime for this route

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/utils/adminAuth';
import models from '@/models';
import { ApiResponse } from '@/types/common';
import { Op } from 'sequelize';

/**
 * GET /api/admin/customers/verify - List customers pending verification
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Verify admin authentication
    const adminAuth = await verifyAdmin(request);
    
    // If verifyAdmin returned an error response
    if ('status' in adminAuth) {
      return adminAuth as NextResponse;
    }
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'PENDING';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;
    
    // Validate status
    if (!['PENDING', 'APPROVED', 'REJECTED', 'ALL'].includes(status)) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Invalid status filter. Must be one of: PENDING, APPROVED, REJECTED, ALL',
        data: null
      }, { status: 400 });
    }
    
    // Prepare where condition
    const whereCondition: any = {};
    if (status !== 'ALL') {
      whereCondition.verification_status = status;
    } else {
      // For ALL, only show customers that have uploaded at least one document
      whereCondition.proof_of_identity = { [Op.not]: null };
    }
    
    // Find customers with verification statuses
    const { count, rows: customers } = await models.Customer.findAndCountAll({
      where: whereCondition,
      attributes: [
        'id', 
        'name', 
        'email', 
        'phone', 
        'company_name', 
        'profile_picture',
        'proof_of_identity', 
        'proof_of_address', 
        'address',
        'is_identity_verified',
        'is_address_verified',
        'verification_status',
        'verification_notes',
        'verification_date',
        'verified_by',
        'created_at', 
        'updated_at'
      ],
      limit,
      offset,
      order: [
        ['verification_status', 'ASC'], // PENDING first, then APPROVED, then REJECTED
        ['created_at', 'DESC'] // Newest first
      ]
    });
    
    // Get admin names for verified_by
    const validAdminIds = customers
      .filter(c => c.verified_by !== null)
      .map(c => c.verified_by)
      .filter((id): id is number => id !== null);
    
    let adminMap: Record<number, string> = {};
    
    if (validAdminIds.length > 0) {
      const admins = await models.Admin.findAll({
        where: { 
          id: { [Op.in]: validAdminIds }
        },
        attributes: ['id', 'name']
      });
      
      adminMap = admins.reduce((map: Record<number, string>, admin: any) => {
        map[admin.id] = admin.name;
        return map;
      }, {});
    }
    
    // Add admin name to each customer
    const processedCustomers = customers.map(c => {
      const data = c.toJSON();
      if (data.verified_by && adminMap[data.verified_by]) {
        (data as any).verified_by_name = adminMap[data.verified_by];
      }
      return data;
    });
    
    // Calculate pagination
    const totalPages = Math.ceil(count / limit);
    const hasMore = page < totalPages;
    
    // Return paginated response
    return NextResponse.json<ApiResponse<any>>({
      success: true,
      message: `Retrieved ${processedCustomers.length} customers with ${status.toLowerCase()} verification status`,
      data: processedCustomers,
      meta: {
        pagination: {
          total: count,
          page,
          limit,
          pages: totalPages,
          hasMore,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Error retrieving customers for verification:', error);
    
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Failed to retrieve customers',
      data: null,
      error: (error as Error).message
    }, { status: 500 });
  }
}

/**
 * POST /api/admin/customers/verify - Verify a customer's profile
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Verify admin authentication
    const adminAuth = await verifyAdmin(request);
    
    // If verifyAdmin returned an error response
    if ('status' in adminAuth) {
      return adminAuth as NextResponse;
    }
    
    // Parse request body
    const body = await request.json();
    const { 
      customer_id, 
      verification_status, 
      is_identity_verified,
      is_address_verified,
      verification_notes 
    } = body;
    
    // Validate customer_id
    if (!customer_id || isNaN(parseInt(customer_id))) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Valid customer ID is required',
        data: null
      }, { status: 400 });
    }
    
    // Validate verification_status
    if (!verification_status || !['APPROVED', 'REJECTED', 'PENDING'].includes(verification_status)) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Valid verification status is required (APPROVED, REJECTED, or PENDING)',
        data: null
      }, { status: 400 });
    }
    
    // Find the customer
    const customer = await models.Customer.findByPk(parseInt(customer_id));
    if (!customer) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Customer not found',
        data: null
      }, { status: 404 });
    }
    
    // Allow manual verification regardless of document status
    // Just log a warning if documents are missing
    if (!customer.proof_of_identity || !customer.proof_of_address || !customer.address) {
      console.warn(`Manual verification requested for customer ${customer_id} with missing documents:`, {
        address: !customer.address,
        proof_of_identity: !customer.proof_of_identity,
        proof_of_address: !customer.proof_of_address
      });
    }
    
    // Update verification status
    await customer.update({
      verification_status,
      is_identity_verified: typeof is_identity_verified === 'boolean' ? is_identity_verified : verification_status === 'APPROVED',
      is_address_verified: typeof is_address_verified === 'boolean' ? is_address_verified : verification_status === 'APPROVED',
      verification_notes: verification_notes || null,
      verification_date: new Date(),
      verified_by: adminAuth.id
    });
    
    // Return updated customer data
    return NextResponse.json<ApiResponse<any>>({
      success: true,
      message: `Customer verification status updated to ${verification_status}`,
      data: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        verification_status: customer.verification_status,
        is_identity_verified: customer.is_identity_verified,
        is_address_verified: customer.is_address_verified,
        verification_date: customer.verification_date,
        verified_by: adminAuth.id,
        admin_name: adminAuth.name
      }
    });
  } catch (error) {
    console.error('Error verifying customer profile:', error);
    
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Failed to update verification status',
      data: null,
      error: (error as Error).message
    }, { status: 500 });
  }
}
