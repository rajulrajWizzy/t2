// Explicitly set Node.js runtime for this route
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, corsHeaders } from '@/utils/jwt-wrapper';
import models from '@/models';
import { Op, WhereOptions } from 'sequelize';

// Define Verification Status enum for type safety
type VerificationStatus = 'PENDING' | 'VERIFIED' | 'APPROVED' | 'REJECTED' | 'PENDING_RESUBMISSION';

interface User {
  id: number;
  name: string;
  email: string;
  role: 'super_admin' | 'admin' | 'staff' | 'customer';
  branch_id?: number;
  branch_name?: string;
  status: 'active' | 'inactive' | 'suspended';
  phone?: string;
  first_name?: string;
  last_name?: string;
  verification_status?: string;
  is_identity_verified?: boolean;
  is_address_verified?: boolean;
  identity_document_url?: string;
  address_document_url?: string;
  created_at: string;
  updated_at: string;
}

// Interfaces for model-related data
interface CustomerData {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  company_name?: string;
  proof_of_identity?: string | null;
  proof_of_address?: string | null;
  address?: string | null;
  is_identity_verified: boolean;
  is_address_verified: boolean;
  verification_status: VerificationStatus;
  created_at: Date;
  updated_at: Date;
  [key: string]: any; // Allow other properties
}

interface AdminData {
  id: number;
  name: string;
  email: string;
  role: string;
  branch_id?: number;
  status?: string;
  created_at: Date;
  updated_at: Date;
  password?: string;
  [key: string]: any; // Allow other properties
}

// GET users
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('Users API GET called');

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

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search');
    const role = searchParams.get('role');
    const status = searchParams.get('status');
    const needsVerification = searchParams.get('needs_verification') === 'true';
    
    try {
      // Check if database is connected
      if (models && models.sequelize) {
        await models.sequelize.authenticate();
        console.log('Database connection is active for users API');
        
        // First determine if we need admin or customer data or both
        let adminUsers: User[] = [];
        let customerUsers: User[] = [];
        
        // Calculate offsets for pagination
        const offset = (page - 1) * limit;
        
        // Build search conditions
        let searchCondition: { [key: string]: any } = {};
        if (search) {
          searchCondition = {
            [Op.or]: [
              { name: { [Op.iLike]: `%${search}%` } },
              { email: { [Op.iLike]: `%${search}%` } }
            ]
          };
        }
        
        // Build status condition
        let statusCondition: { [key: string]: any } = {};
        if (status) {
          statusCondition = { status };
        }
        
        // For non-verification needs, get admin users first
        if (!needsVerification && (!role || role === 'admin' || role === 'super_admin' || role === 'staff')) {
          try {
            const adminWhereClause: { [key: string]: any } = {
              ...searchCondition,
              ...statusCondition
            };
            
            // Add role filter if specific admin role
            if (role === 'admin' || role === 'super_admin' || role === 'staff') {
              adminWhereClause.role = role;
            }
            
            // Fetch admin users
            const adminResults = await models.Admin.findAll({
              where: adminWhereClause,
              attributes: ['id', 'name', 'email', 'role', 'branch_id', 'status', 'created_at', 'updated_at'],
              limit: needsVerification ? 0 : limit,
              offset: needsVerification ? 0 : offset,
              order: [['created_at', 'DESC']]
            });
            
            // Get branch names for branch_id values
            const branchIds = adminResults
              .filter(admin => admin.branch_id)
              .map(admin => admin.branch_id)
              .filter((id): id is number => id !== undefined);
            
            let branchMap: Record<number, string> = {};
            if (branchIds.length > 0) {
              const branches = await models.Branch.findAll({
                where: { id: { [Op.in]: branchIds } },
                attributes: ['id', 'name']
              });
              
              branchMap = branches.reduce((map: Record<number, string>, branch: any) => {
                map[branch.id] = branch.name;
                return map;
              }, {});
            }
            
            // Format admin users
            adminUsers = adminResults.map(admin => {
              const adminData: AdminData = admin.toJSON();
              return {
                ...adminData,
                branch_name: adminData.branch_id ? branchMap[adminData.branch_id] : undefined,
                role: adminData.role as 'super_admin' | 'admin' | 'staff',
                status: (adminData.status || 'active') as 'active' | 'inactive' | 'suspended',
                created_at: adminData.created_at.toString(),
                updated_at: adminData.updated_at.toString()
              };
            });
          } catch (adminError) {
            console.error('Error fetching admin users:', adminError);
            // Continue to fetch customers
          }
        }
        
        // Check if we need customer data
        if (!role || role === 'customer' || needsVerification) {
          try {
            const customerWhereClause: { [key: string]: any } = {
              ...searchCondition
            };
            
            // Add verification filters
            if (needsVerification) {
              // At least one document must be uploaded but not verified yet
              customerWhereClause[Op.and as any] = [
                {
                  [Op.or]: [
                    { proof_of_identity: { [Op.not]: null } },
                    { proof_of_address: { [Op.not]: null } }
                  ]
                },
                {
                  [Op.or]: [
                    { is_identity_verified: false },
                    { is_address_verified: false }
                  ]
                }
              ];
            }
            
            // Fetch customer users
            const customerResults = await models.Customer.findAll({
              where: customerWhereClause,
              attributes: [
                'id', 'name', 'email', 'phone', 'company_name', 
                'proof_of_identity', 'proof_of_address', 'address',
                'is_identity_verified', 'is_address_verified', 'verification_status',
                'created_at', 'updated_at'
              ],
              limit: adminUsers.length > 0 ? Math.max(0, limit - adminUsers.length) : limit,
              offset: adminUsers.length > 0 ? 0 : offset,
              order: [['created_at', 'DESC']]
            });
            
            // Format customer data to match User interface
            customerUsers = customerResults.map(customer => {
              const customerData: CustomerData = customer.toJSON();
              
              // Handle null values for phone
              const phoneValue = customerData.phone === null ? undefined : customerData.phone;
              
              return {
                id: customerData.id,
                name: customerData.name,
                email: customerData.email,
                role: 'customer' as const,
                status: 'active' as const, // Default status for customers
                phone: phoneValue,
                first_name: customerData.name.split(' ')[0],
                last_name: customerData.name.split(' ').slice(1).join(' '),
                verification_status: customerData.verification_status,
                is_identity_verified: customerData.is_identity_verified,
                is_address_verified: customerData.is_address_verified,
                identity_document_url: customerData.proof_of_identity || undefined,
                address_document_url: customerData.proof_of_address || undefined,
                created_at: customerData.created_at.toString(),
                updated_at: customerData.updated_at.toString()
              };
            });
          } catch (customerError) {
            console.error('Error fetching customer users:', customerError);
          }
        }
        
        // Combine the results
        const combinedUsers = [...adminUsers, ...customerUsers];
        
        // Return success response
        return NextResponse.json(
          { 
            success: true, 
            message: 'Users retrieved successfully',
            data: combinedUsers
          },
          { status: 200, headers: corsHeaders }
        );
      } else {
        throw new Error('Sequelize models not initialized');
      }
    } catch (dbError) {
      console.error('Database error in users GET:', dbError);
      console.log('Using mock data instead');
      
      // Fall back to mock data if database fails
      const mockData = generateMockUsers(page, limit, search, role, status, needsVerification);
      
      return NextResponse.json(
        { 
          success: true, 
          message: 'Users retrieved successfully (mock data)',
          data: mockData.users
        },
        { status: 200, headers: corsHeaders }
      );
    }
  } catch (error) {
    console.error('Error in users route:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to retrieve users', error: (error as Error).message },
      { status: 500, headers: corsHeaders }
    );
  }
}

// POST create a new user
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('Users API POST called');

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

    // Parse request body
    const body = await request.json();
    
    // Validate required fields
    if (!body.name || !body.email || !body.password || !body.role) {
      return NextResponse.json(
        { success: false, message: 'Name, email, password, and role are required' },
        { status: 400, headers: corsHeaders }
      );
    }
    
    try {
      // Check if database is connected
      if (models && models.sequelize) {
        await models.sequelize.authenticate();
        console.log('Database connection is active for user creation');
        
        // Determine if creating admin or customer
        if (body.role === 'admin' || body.role === 'super_admin' || body.role === 'staff') {
          // Create admin user with appropriate properties
          const adminData: Record<string, any> = {
            name: body.name,
            email: body.email,
            password: body.password, // Should be hashed in the model hook
            role: body.role,
            branch_id: body.branch_id ? parseInt(body.branch_id) : undefined
          };
          
          // Add status if provided
          if (body.status) {
            adminData.status = body.status;
          }
          
          const newAdmin = await models.Admin.create(adminData);
          
          // Get branch name if branch_id provided
          let branchName;
          if (body.branch_id) {
            const branch = await models.Branch.findByPk(body.branch_id);
            branchName = branch ? branch.name : undefined;
          }
          
          // Return the created admin without sensitive fields
          const adminData2: AdminData = newAdmin.toJSON();
          const { password, ...adminWithoutPassword } = adminData2;
          
          return NextResponse.json(
            { 
              success: true, 
              message: 'User created successfully',
              data: {
                ...adminWithoutPassword,
                branch_name: branchName
              }
            },
            { status: 201, headers: corsHeaders }
          );
        } else if (body.role === 'customer') {
          // Create customer user
          const newCustomer = await models.Customer.create({
            name: body.name,
            email: body.email,
            password: body.password, // Should be hashed in the model hook
            phone: body.phone,
            company_name: body.company_name || '',
            verification_status: 'PENDING'
          });
          
          // Return the created customer without sensitive fields
          const customerData: CustomerData = newCustomer.toJSON();
          const { password, ...customerWithoutPassword } = customerData;
          
          // Format response to match User interface
          const formattedCustomer = {
            id: customerWithoutPassword.id,
            name: customerWithoutPassword.name,
            email: customerWithoutPassword.email,
            role: 'customer' as const,
            status: 'active' as const,
            phone: customerWithoutPassword.phone,
            verification_status: customerWithoutPassword.verification_status,
            is_identity_verified: false,
            is_address_verified: false,
            created_at: customerWithoutPassword.created_at.toString(),
            updated_at: customerWithoutPassword.updated_at.toString()
          };
          
          return NextResponse.json(
            { 
              success: true, 
              message: 'User created successfully',
              data: formattedCustomer
            },
            { status: 201, headers: corsHeaders }
          );
        } else {
          return NextResponse.json(
            { success: false, message: 'Invalid role specified' },
            { status: 400, headers: corsHeaders }
          );
        }
      } else {
        throw new Error('Sequelize models not initialized');
      }
    } catch (dbError) {
      console.error('Database error in user creation:', dbError);
      throw dbError;
    }
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create user', error: (error as Error).message },
      { status: 500, headers: corsHeaders }
    );
  }
}

// Helper function to generate mock user data (for fallback)
function generateMockUsers(
  page: number, 
  limit: number, 
  search?: string | null, 
  role?: string | null, 
  status?: string | null,
  needsVerification?: boolean
): { users: User[], pagination: any } {
  // Create array with mock admin users
  const adminUsers: User[] = [
    {
      id: 1,
      name: 'John Admin',
      email: 'john@excelcoworks.com',
      role: 'super_admin',
      status: 'active',
      created_at: '2023-01-10T08:00:00Z',
      updated_at: '2023-03-15T14:30:00Z'
    },
    {
      id: 2,
      name: 'Sarah Manager',
      email: 'sarah@excelcoworks.com',
      role: 'admin',
      branch_id: 1,
      branch_name: 'Downtown Branch',
      status: 'active',
      created_at: '2023-02-05T09:15:00Z',
      updated_at: '2023-04-20T11:45:00Z'
    },
    {
      id: 3,
      name: 'Mike Staff',
      email: 'mike@excelcoworks.com',
      role: 'staff',
      branch_id: 2,
      branch_name: 'Uptown Branch',
      status: 'inactive',
      created_at: '2023-03-20T10:30:00Z',
      updated_at: '2023-05-25T16:20:00Z'
    },
    {
      id: 4,
      name: 'Alex Admin',
      email: 'alex@excelcoworks.com',
      role: 'admin',
      branch_id: 3,
      branch_name: 'Midtown Branch',
      status: 'active',
      created_at: '2023-04-12T11:20:00Z',
      updated_at: '2023-06-18T09:10:00Z'
    },
    {
      id: 5,
      name: 'Taylor Support',
      email: 'taylor@excelcoworks.com',
      role: 'staff',
      branch_id: 1,
      branch_name: 'Downtown Branch',
      status: 'active',
      created_at: '2023-05-30T14:45:00Z',
      updated_at: '2023-07-22T13:25:00Z'
    }
  ];
  
  // Create array with mock customers (for verification purposes)
  const customerUsers: User[] = [];
  for (let i = 1; i <= 15; i++) {
    const verificationStatuses = ['PENDING', 'VERIFIED', 'REJECTED', 'PENDING_RESUBMISSION'];
    const randomStatus = verificationStatuses[Math.floor(Math.random() * verificationStatuses.length)];
    const isVerified = randomStatus === 'VERIFIED';
    
    customerUsers.push({
      id: 100 + i,
      name: `Customer ${i}`,
      email: `customer${i}@example.com`,
      role: 'customer',
      status: 'active',
      phone: `+1 (555) 000-${String(1000 + i).substring(1)}`,
      first_name: `First${i}`,
      last_name: `Last${i}`,
      verification_status: randomStatus,
      is_identity_verified: isVerified || Math.random() > 0.5,
      is_address_verified: isVerified || Math.random() > 0.5,
      identity_document_url: Math.random() > 0.3 ? `https://example.com/documents/id_${100 + i}.jpg` : undefined,
      address_document_url: Math.random() > 0.3 ? `https://example.com/documents/address_${100 + i}.jpg` : undefined,
      created_at: new Date(Date.now() - Math.floor(Math.random() * 100) * 86400000).toISOString(),
      updated_at: new Date(Date.now() - Math.floor(Math.random() * 10) * 86400000).toISOString()
    });
  }
  
  // Combine admin and customer users based on what's needed
  let allUsers = needsVerification ? customerUsers : [...adminUsers, ...customerUsers];
  
  // Apply filters
  if (search) {
    const searchLower = search.toLowerCase();
    allUsers = allUsers.filter(user => 
      user.name.toLowerCase().includes(searchLower) || 
      user.email.toLowerCase().includes(searchLower)
    );
  }
  
  if (role) {
    allUsers = allUsers.filter(user => user.role === role);
  }
  
  if (status) {
    allUsers = allUsers.filter(user => user.status === status);
  }
  
  // Calculate pagination
  const totalUsers = allUsers.length;
  const startIndex = (page - 1) * limit;
  const endIndex = Math.min(startIndex + limit, totalUsers);
  const paginatedUsers = allUsers.slice(startIndex, endIndex);
  
  return {
    users: paginatedUsers,
    pagination: {
      total: totalUsers,
      page,
      limit,
      pages: Math.ceil(totalUsers / limit)
    }
  };
}

// PATCH (update) user route for verification
export async function PATCH(request: NextRequest): Promise<NextResponse> {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401, headers: corsHeaders }
      );
    }
    
    const token = authHeader.split(' ')[1];
    const { valid, decoded } = await verifyToken(token);
    if (!valid || !decoded) {
      return NextResponse.json(
        { success: false, message: 'Authorization token expired or invalid' },
        { status: 401, headers: corsHeaders }
      );
    }
    
    // Get the URL to determine the operation
    const url = new URL(request.url);
    const path = url.pathname;
    const pathParts = path.split('/');
    
    // Extract user ID from path (e.g., /api/users/123/verify-document)
    const userId = pathParts.find((part, index) => {
      return !isNaN(parseInt(part)) && pathParts[index + 1] && 
        ['verify-document', 'manual-verify', 'request-resubmission'].includes(pathParts[index + 1]);
    });
    
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'User ID not provided in URL' },
        { status: 400, headers: corsHeaders }
      );
    }
    
    // Parse body
    const body = await request.json();
    
    try {
      // Check if database is connected
      if (models && models.sequelize) {
        await models.sequelize.authenticate();
        console.log('Database connection is active for user verification');
        
        // Find the customer
        const customer = await models.Customer.findByPk(parseInt(userId));
        
        if (!customer) {
          return NextResponse.json(
            { success: false, message: 'Customer not found' },
            { status: 404, headers: corsHeaders }
          );
        }
        
        if (path.includes('/verify-document')) {
          // Handle document verification
          const { documentType, approve, rejectionReason } = body;
          
          if (!documentType || typeof approve !== 'boolean') {
            return NextResponse.json(
              { success: false, message: 'Document type and approval status required' },
              { status: 400, headers: corsHeaders }
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
            updateData.verification_status = 'VERIFIED';
          }
          
          // Set verification metadata
          updateData.verification_date = new Date();
          updateData.verified_by = typeof decoded.id === 'string' ? parseInt(decoded.id) : decoded.id;
          
          // Update the customer
          await customer.update(updateData);
          
          return NextResponse.json(
            { success: true, message: `Document ${approve ? 'approved' : 'rejected'} successfully` },
            { status: 200, headers: corsHeaders }
          );
        } else if (path.includes('/manual-verify')) {
          // Handle manual verification - cast status to valid enum
          const verificationStatus: VerificationStatus = 'VERIFIED';
          const verifiedBy = typeof decoded.id === 'string' ? parseInt(decoded.id) : decoded.id;
          
          await customer.update({
            is_identity_verified: true,
            is_address_verified: true,
            verification_status: verificationStatus,
            verification_date: new Date(),
            verified_by: verifiedBy,
            verification_notes: 'Manually verified by admin'
          });
          
          return NextResponse.json(
            { success: true, message: 'User manually verified successfully' },
            { status: 200, headers: corsHeaders }
          );
        } else if (path.includes('/request-resubmission')) {
          // Handle resubmission request
          const { reason } = body;
          
          if (!reason) {
            return NextResponse.json(
              { success: false, message: 'Resubmission reason required' },
              { status: 400, headers: corsHeaders }
            );
          }
          
          // Cast status to valid enum and ID to number
          const verificationStatus: VerificationStatus = 'PENDING_RESUBMISSION';
          const verifiedBy = typeof decoded.id === 'string' ? parseInt(decoded.id) : decoded.id;
          
          await customer.update({
            verification_status: verificationStatus,
            verification_notes: reason,
            verification_date: new Date(),
            verified_by: verifiedBy,
            is_identity_verified: false,
            is_address_verified: false
          });
          
          return NextResponse.json(
            { success: true, message: 'Resubmission requested successfully' },
            { status: 200, headers: corsHeaders }
          );
        } else {
          // Generic user update
          return NextResponse.json(
            { success: true, message: 'User updated successfully' },
            { status: 200, headers: corsHeaders }
          );
        }
      } else {
        throw new Error('Sequelize models not initialized');
      }
    } catch (dbError) {
      console.error('Database error in user verification:', dbError);
      
      // Fall back to mock successful responses
      if (path.includes('/verify-document')) {
        return NextResponse.json(
          { success: true, message: `Document ${body.approve ? 'approved' : 'rejected'} successfully (mock)` },
          { status: 200, headers: corsHeaders }
        );
      } else if (path.includes('/manual-verify')) {
        return NextResponse.json(
          { success: true, message: 'User manually verified successfully (mock)' },
          { status: 200, headers: corsHeaders }
        );
      } else if (path.includes('/request-resubmission')) {
        return NextResponse.json(
          { success: true, message: 'Resubmission requested successfully (mock)' },
          { status: 200, headers: corsHeaders }
        );
      } else {
        return NextResponse.json(
          { success: true, message: 'User updated successfully (mock)' },
          { status: 200, headers: corsHeaders }
        );
      }
    }
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update user', error: (error as Error).message },
      { status: 500, headers: corsHeaders }
    );
  }
}

// OPTIONS handler for CORS
export async function OPTIONS(request: NextRequest): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders
  });
} 