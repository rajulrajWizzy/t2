// Explicitly set Node.js runtime for this route
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/utils/jwt';
import { verifyAdmin } from '@/utils/adminAuth';
import models from '@/models';
import { Op } from 'sequelize';
import { corsHeaders } from '@/utils/jwt-wrapper';
import { requireSuperAdmin } from '../../middleware/requireRole';
import bcrypt from 'bcryptjs';
import { AdminRole } from '@/models/admin';

// Keep mock data as fallback for development/testing
const adminUsers = [
  {
    id: '1',
    name: 'Super Admin',
    email: 'superadmin@example.com',
    role: 'super_admin',
    createdAt: '2023-01-15T10:00:00Z',
  },
  {
    id: '2',
    name: 'Branch Admin 1',
    email: 'branchadmin1@example.com',
    role: 'branch_admin',
    branchId: 'b1',
    branchName: 'Downtown Branch',
    createdAt: '2023-02-20T14:30:00Z',
  },
  {
    id: '3',
    name: 'Branch Admin 2',
    email: 'branchadmin2@example.com',
    role: 'branch_admin',
    branchId: 'b2',
    branchName: 'Westside Branch',
    createdAt: '2023-03-10T09:15:00Z',
  }
];

// Keep mock data as fallback for development/testing
const regularUsers = [
  {
    id: '101',
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+1234567890',
    membershipType: 'Premium',
    status: 'active',
    branchId: 'b1',
    branchName: 'Downtown Branch',
    createdAt: '2023-04-15T10:00:00Z',
    lastLogin: '2023-06-20T14:30:00Z',
    bookingsCount: 24
  },
  {
    id: '102',
    name: 'Jane Smith',
    email: 'jane.smith@example.com',
    phone: '+1987654321',
    membershipType: 'Basic',
    status: 'active',
    branchId: 'b1',
    branchName: 'Downtown Branch',
    createdAt: '2023-03-22T09:15:00Z',
    lastLogin: '2023-06-18T11:45:00Z',
    bookingsCount: 12
  },
  {
    id: '103',
    name: 'Robert Johnson',
    email: 'robert.j@example.com',
    phone: '+1122334455',
    membershipType: 'Premium',
    status: 'inactive',
    branchId: 'b2',
    branchName: 'Westside Branch',
    createdAt: '2023-02-10T16:20:00Z',
    lastLogin: '2023-05-05T10:30:00Z',
    bookingsCount: 8
  },
  {
    id: '104',
    name: 'Emily Davis',
    email: 'emily.d@example.com',
    phone: '+1555666777',
    membershipType: 'Premium',
    status: 'active',
    branchId: 'b3',
    branchName: 'North Campus',
    createdAt: '2023-05-05T14:00:00Z',
    lastLogin: '2023-06-19T09:00:00Z',
    bookingsCount: 15
  },
  {
    id: '105',
    name: 'Michael Wilson',
    email: 'michael.w@example.com',
    phone: '+1777888999',
    membershipType: 'Basic',
    status: 'pending',
    branchId: 'b2',
    branchName: 'Westside Branch',
    createdAt: '2023-06-01T11:30:00Z',
    lastLogin: null,
    bookingsCount: 0
  }
];

/**
 * GET /api/admin/users - Get all admin users (super admin only)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Apply super admin middleware
    const middleware = requireSuperAdmin();
    const middlewareResponse = await middleware(request);
    if (middlewareResponse.status !== 200) {
      return middlewareResponse;
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';
    const offset = (page - 1) * limit;

    // Build where clause
    const whereClause: any = {};
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
      ];
    }
    if (role) {
      whereClause.role = role;
    }

    // Get admins with pagination
    const { rows: admins, count: total } = await models.Admin.findAndCountAll({
      where: whereClause,
      attributes: [
        'id', 'email', 'name', 'role', 'branch_id', 'phone', 
        'profile_picture', 'is_active', 'permissions', 'last_login',
        'created_at', 'updated_at'
      ],
      limit,
      offset,
      order: [['created_at', 'DESC']]
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Admins retrieved successfully',
        data: {
          admins,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
          }
        }
      },
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    console.error('[Admin Users API] Error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to retrieve admins' },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * POST /api/admin/users - Create new admin user (super admin only)
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Apply super admin middleware
    const middleware = requireSuperAdmin();
    const middlewareResponse = await middleware(request);
    if (middlewareResponse.status !== 200) {
      return middlewareResponse;
    }

    // Parse request body
    const body = await request.json();
    const { email, password, name, role, branch_id, phone } = body;

    // Validate required fields
    if (!email || !password || !name || !role) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate role
    if (!Object.values(AdminRole).includes(role)) {
      return NextResponse.json(
        { success: false, message: 'Invalid role' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Check if email already exists
    const existingAdmin = await models.Admin.findOne({
      where: { email: email.toLowerCase() }
    });

    if (existingAdmin) {
      return NextResponse.json(
        { success: false, message: 'Email already exists' },
        { status: 409, headers: corsHeaders }
      );
    }

    // Generate username from email
    const username = email.split('@')[0].toLowerCase();

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create admin
    const admin = await models.Admin.create({
      email: email.toLowerCase(),
      username,
      password: hashedPassword,
      name,
      role,
      branch_id,
      phone,
      is_active: true,
      permissions: models.Admin.getDefaultPermissions(role)
    });

    // Get admin data without password
    const adminData = await models.Admin.findOne({
      where: { id: admin.id },
      attributes: [
        'id', 'email', 'name', 'role', 'branch_id', 'phone', 
        'profile_picture', 'is_active', 'permissions', 'last_login',
        'created_at', 'updated_at'
      ]
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Admin created successfully',
        data: { admin: adminData }
      },
      { status: 201, headers: corsHeaders }
    );

  } catch (error) {
    console.error('[Admin Users API] Error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create admin' },
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
