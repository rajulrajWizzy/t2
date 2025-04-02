// Explicitly set Node.js runtime for this route
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, corsHeaders } from '@/utils/jwt-wrapper';
import models from '@/models';

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
): Promise<NextResponse> {
  try {
    console.log(`User API GET called for user ID: ${params.userId}`);

    // Get token from the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401, headers: corsHeaders }
      );
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify the token
    const { valid, decoded } = await verifyToken(token);
    if (!valid || !decoded) {
      return NextResponse.json(
        { success: false, message: 'Authorization token expired or invalid' },
        { status: 401, headers: corsHeaders }
      );
    }
    
    // Validate user ID
    const userId = params.userId;
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'User ID is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    try {
      // Check if database is connected
      if (models && models.sequelize) {
        await models.sequelize.authenticate();
        console.log('Database connection is active for user fetch');
        
        // Try to find user as admin first
        let adminUser = null;
        try {
          adminUser = await models.Admin.findByPk(userId, {
            attributes: { exclude: ['password'] }
          });
        } catch (adminError) {
          console.error('Error finding admin:', adminError);
        }
        
        if (adminUser) {
          const userData = adminUser.toJSON();
          
          // Get branch name if branch_id is present
          if (userData.branch_id) {
            try {
              const branch = await models.Branch.findByPk(userData.branch_id);
              if (branch) {
                (userData as any).branch_name = branch.name;
              }
            } catch (branchError) {
              console.error('Error finding branch:', branchError);
            }
          }
          
          return NextResponse.json(
            { 
              success: true, 
              message: 'Admin user retrieved successfully',
              data: {
                ...userData,
                role: userData.role || 'admin',
                user_type: 'admin'
              }
            },
            { status: 200, headers: corsHeaders }
          );
        }
        
        // If not found as admin, try customer
        let customerUser = null;
        try {
          customerUser = await models.Customer.findByPk(userId, {
            attributes: { exclude: ['password', 'reset_token', 'reset_token_expiry'] }
          });
        } catch (customerError) {
          console.error('Error finding customer:', customerError);
        }
        
        if (customerUser) {
          const userData = customerUser.toJSON();
          return NextResponse.json(
            { 
              success: true, 
              message: 'Customer retrieved successfully',
              data: {
                ...userData,
                role: 'customer',
                user_type: 'customer',
                first_name: userData.name ? userData.name.split(' ')[0] : '',
                last_name: userData.name ? userData.name.split(' ').slice(1).join(' ') : ''
              }
            },
            { status: 200, headers: corsHeaders }
          );
        }
        
        // User not found
        return NextResponse.json(
          { success: false, message: 'User not found' },
          { status: 404, headers: corsHeaders }
        );
      } else {
        throw new Error('Sequelize models not initialized');
      }
    } catch (dbError) {
      console.error('Database error in user GET:', dbError);
      throw dbError;
    }
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch user', error: (error as Error).message },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { userId: string } }
): Promise<NextResponse> {
  try {
    console.log(`User API PATCH called for user ID: ${params.userId}`);

    // Get token from the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401, headers: corsHeaders }
      );
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify the token
    const { valid, decoded } = await verifyToken(token);
    if (!valid || !decoded) {
      return NextResponse.json(
        { success: false, message: 'Authorization token expired or invalid' },
        { status: 401, headers: corsHeaders }
      );
    }
    
    // Validate user ID
    const userId = params.userId;
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'User ID is required' },
        { status: 400, headers: corsHeaders }
      );
    }
    
    // Parse body
    const body = await request.json();
    
    try {
      // Check if database is connected
      if (models && models.sequelize) {
        await models.sequelize.authenticate();
        console.log('Database connection is active for user update');
        
        // Get the action from URL
        const { searchParams } = new URL(request.url);
        const action = searchParams.get('action');
        
        // Determine the update target based on the action
        if (action === 'verify-document') {
          return await handleDocumentVerification(userId, body, decoded);
        } else if (action === 'manual-verify') {
          return await handleManualVerification(userId, decoded);
        } else if (action === 'request-resubmission') {
          return await handleRequestResubmission(userId, body, decoded);
        } else {
          // Generic profile update
          return await handleProfileUpdate(userId, body, decoded);
        }
      } else {
        throw new Error('Sequelize models not initialized');
      }
    } catch (dbError) {
      console.error('Database error in user update:', dbError);
      throw dbError;
    }
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update user', error: (error as Error).message },
      { status: 500, headers: corsHeaders }
    );
  }
}

// Handler for document verification
async function handleDocumentVerification(
  userId: string, 
  body: any, 
  decoded: any
): Promise<NextResponse> {
  const { documentType, approve, rejectionReason } = body;
  
  if (!documentType || typeof approve !== 'boolean') {
    return NextResponse.json(
      { success: false, message: 'Document type and approval status required' },
      { status: 400, headers: corsHeaders }
    );
  }
  
  // Find the customer
  let customer = null;
  try {
    customer = await models.Customer.findByPk(parseInt(userId));
  } catch (error) {
    console.error('Error finding customer:', error);
    return NextResponse.json(
      { success: false, message: 'Error finding customer', error: (error as Error).message },
      { status: 500, headers: corsHeaders }
    );
  }
  
  if (!customer) {
    return NextResponse.json(
      { success: false, message: 'Customer not found' },
      { status: 404, headers: corsHeaders }
    );
  }
  
  const updateData: Record<string, any> = {};
  
  if (documentType === 'identity') {
    updateData.is_identity_verified = approve;
  } else if (documentType === 'address') {
    updateData.is_address_verified = approve;
  } else {
    return NextResponse.json(
      { success: false, message: 'Invalid document type' },
      { status: 400, headers: corsHeaders }
    );
  }
  
  // Update verification status if rejecting
  if (!approve) {
    updateData.verification_status = 'REJECTED';
    updateData.verification_notes = rejectionReason || 'Document verification rejected';
  } else if (
    (documentType === 'identity' && customer.is_address_verified) ||
    (documentType === 'address' && customer.is_identity_verified)
  ) {
    // If the other document is already verified, mark as fully verified
    updateData.verification_status = 'APPROVED';
  }
  
  // Set verification metadata
  updateData.verification_date = new Date();
  updateData.verified_by = typeof decoded.id === 'string' ? parseInt(decoded.id) : decoded.id;
  
  // Update the customer
  try {
    await customer.update(updateData);
  } catch (error) {
    console.error('Error updating customer:', error);
    return NextResponse.json(
      { success: false, message: 'Error updating customer', error: (error as Error).message },
      { status: 500, headers: corsHeaders }
    );
  }
  
  return NextResponse.json(
    { success: true, message: `Document ${approve ? 'approved' : 'rejected'} successfully` },
    { status: 200, headers: corsHeaders }
  );
}

// Handler for manual verification
async function handleManualVerification(
  userId: string, 
  decoded: any
): Promise<NextResponse> {
  // Find the customer
  let customer = null;
  try {
    customer = await models.Customer.findByPk(parseInt(userId));
  } catch (error) {
    console.error('Error finding customer:', error);
    return NextResponse.json(
      { success: false, message: 'Error finding customer', error: (error as Error).message },
      { status: 500, headers: corsHeaders }
    );
  }
  
  if (!customer) {
    return NextResponse.json(
      { success: false, message: 'Customer not found' },
      { status: 404, headers: corsHeaders }
    );
  }
  
  const verifiedBy = typeof decoded.id === 'string' ? parseInt(decoded.id) : decoded.id;
  
  try {
    await customer.update({
      is_identity_verified: true,
      is_address_verified: true,
      verification_status: 'APPROVED',
      verification_date: new Date(),
      verified_by: verifiedBy,
      verification_notes: 'Manually verified by admin'
    });
  } catch (error) {
    console.error('Error updating customer:', error);
    return NextResponse.json(
      { success: false, message: 'Error updating customer', error: (error as Error).message },
      { status: 500, headers: corsHeaders }
    );
  }
  
  return NextResponse.json(
    { success: true, message: 'User manually verified successfully' },
    { status: 200, headers: corsHeaders }
  );
}

// Handler for resubmission request
async function handleRequestResubmission(
  userId: string, 
  body: any, 
  decoded: any
): Promise<NextResponse> {
  const { reason } = body;
  
  if (!reason) {
    return NextResponse.json(
      { success: false, message: 'Resubmission reason required' },
      { status: 400, headers: corsHeaders }
    );
  }
  
  // Find the customer
  let customer = null;
  try {
    customer = await models.Customer.findByPk(parseInt(userId));
  } catch (error) {
    console.error('Error finding customer:', error);
    return NextResponse.json(
      { success: false, message: 'Error finding customer', error: (error as Error).message },
      { status: 500, headers: corsHeaders }
    );
  }
  
  if (!customer) {
    return NextResponse.json(
      { success: false, message: 'Customer not found' },
      { status: 404, headers: corsHeaders }
    );
  }
  
  const verifiedBy = typeof decoded.id === 'string' ? parseInt(decoded.id) : decoded.id;
  
  try {
    await customer.update({
      verification_status: 'PENDING',
      verification_notes: reason,
      verification_date: new Date(),
      verified_by: verifiedBy,
      is_identity_verified: false,
      is_address_verified: false
    });
  } catch (error) {
    console.error('Error updating customer:', error);
    return NextResponse.json(
      { success: false, message: 'Error updating customer', error: (error as Error).message },
      { status: 500, headers: corsHeaders }
    );
  }
  
  return NextResponse.json(
    { success: true, message: 'Resubmission requested successfully' },
    { status: 200, headers: corsHeaders }
  );
}

// Handler for generic profile update
async function handleProfileUpdate(
  userId: string, 
  body: any, 
  decoded: any
): Promise<NextResponse> {
  // Determine if this is an admin or customer user
  let user = null;
  let userType = '';
  
  try {
    user = await models.Admin.findByPk(parseInt(userId));
    if (user) {
      userType = 'admin';
    } else {
      user = await models.Customer.findByPk(parseInt(userId));
      if (user) {
        userType = 'customer';
      }
    }
  } catch (error) {
    console.error('Error finding user:', error);
    return NextResponse.json(
      { success: false, message: 'Error finding user', error: (error as Error).message },
      { status: 500, headers: corsHeaders }
    );
  }
  
  if (!user) {
    return NextResponse.json(
      { success: false, message: 'User not found' },
      { status: 404, headers: corsHeaders }
    );
  }
  
  // Validate permission - admin can update any user, but a user can only update themself
  const isAdmin = decoded.role === 'admin' || decoded.role === 'super_admin';
  const isSameUser = decoded.id.toString() === userId;
  
  if (!isAdmin && !isSameUser) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized to update this user' },
      { status: 403, headers: corsHeaders }
    );
  }
  
  // Define allowed fields based on user type
  const allowedFields = userType === 'admin' 
    ? ['name', 'email', 'phone', 'branch_id', 'status', 'role'] 
    : ['name', 'email', 'phone', 'address', 'company_name'];
  
  // Filter update data
  const updateData: Record<string, any> = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updateData[field] = body[field];
    }
  }
  
  // Update the user
  try {
    // Use type assertion to handle both Admin and Customer model instances
    await (user as any).update(updateData);
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { success: false, message: 'Error updating user profile', error: (error as Error).message },
      { status: 500, headers: corsHeaders }
    );
  }
  
  return NextResponse.json(
    { success: true, message: 'User profile updated successfully' },
    { status: 200, headers: corsHeaders }
  );
}

export async function OPTIONS(request: NextRequest): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders
  });
} 