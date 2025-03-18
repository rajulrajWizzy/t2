import { NextRequest, NextResponse } from 'next/server';
import models from '@/models';
import { verifyToken } from '@/config/jwt';
import { ApiResponse } from '@/types/common';
import { Customer, UserRole } from '@/types/auth';
import { Op } from 'sequelize';

// GET customers list with pagination and search
export async function GET(request: NextRequest): Promise<NextResponse> {
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
        message: 'Invalid token',
        data: null
      }, { status: 401 });
    }
    
    // Check if user is admin
    if (decoded.role !== UserRole.BRANCH_ADMIN && decoded.role !== UserRole.SUPER_ADMIN) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Admin access required',
        data: null
      }, { status: 403 });
    }
    
    // Parse query parameters
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const search = url.searchParams.get('search') || '';
    
    const offset = (page - 1) * limit;
    
    // Build search condition
    const searchCondition = search 
      ? {
          [Op.or]: [
            { name: { [Op.like]: `%${search}%` } },
            { email: { [Op.like]: `%${search}%` } }
          ]
        } 
      : {};
      
    // For branch admin, only show customers from their managed branch
    let branchCondition = {};
    if (decoded.role === UserRole.BRANCH_ADMIN && decoded.managed_branch_id) {
      // Get bookings for the branch to find customers
      const branchBookings = await models.SeatBooking.findAll({
        where: { branch_id: decoded.managed_branch_id },
        attributes: ['customer_id'],
        raw: true
      });
      
      const customerIds = branchBookings.map(booking => booking.customer_id);
      
      branchCondition = {
        id: { [Op.in]: customerIds }
      };
    }
    
    // Get customers with pagination
    const { count, rows } = await models.Customer.findAndCountAll({
      where: {
        ...searchCondition,
        ...branchCondition
      },
      attributes: { exclude: ['password'] },
      limit,
      offset,
      order: [['id', 'DESC']]
    });
    
    return NextResponse.json<ApiResponse<{ customers: Omit<Customer, 'password'>[], total: number }>>({
      success: true,
      message: 'Customers retrieved successfully',
      data: {
        customers: rows.map(customer => customer.get({ plain: true })) as Omit<Customer, 'password'>[],
        total: count
      }
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Failed to fetch customers',
      data: null
    }, { status: 500 });
  }
}

// POST create a new customer
export async function POST(request: NextRequest): Promise<NextResponse> {
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
        message: 'Invalid token',
        data: null
      }, { status: 401 });
    }
    
    // Check if user is admin
    if (decoded.role !== UserRole.BRANCH_ADMIN && decoded.role !== UserRole.SUPER_ADMIN) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Admin access required',
        data: null
      }, { status: 403 });
    }
    
    // Parse request body
    const body = await request.json();
    const { 
      name, 
      email, 
      password, 
      phone, 
      company_name, 
      profile_picture,
      role 
    } = body;
    
    // Validate required fields
    if (!name || !email || !password) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Name, email, and password are required',
        data: null
      }, { status: 400 });
    }
    
    // Check if email is already taken
    const existingCustomer = await models.Customer.findOne({
      where: { email }
    });
    
    if (existingCustomer) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Email is already in use',
        data: null
      }, { status: 409 });
    }
    
    // Set customer role
    // Only super admin can create other admins
    let customerRole = UserRole.CUSTOMER;
    if (role) {
      if (decoded.role !== UserRole.SUPER_ADMIN && 
          (role === UserRole.SUPER_ADMIN || role === UserRole.BRANCH_ADMIN)) {
        return NextResponse.json<ApiResponse<null>>({
          success: false,
          message: 'Only Super Admin can create admin accounts',
          data: null
        }, { status: 403 });
      }
      customerRole = role;
    }
    
    // Create the customer
    const newCustomer = await models.Customer.create({
      name,
      email,
      password, // Will be hashed by pre-save hook in the model
      phone: phone || null,
      company_name: company_name || null,
      profile_picture: profile_picture || null,
      role: customerRole,
      managed_branch_id: null // Set this only for branch admins if needed
    });
    
    // Return customer data without password
    const customerData = newCustomer.get({ plain: true });
    delete customerData.password;
    
    return NextResponse.json<ApiResponse<Omit<Customer, 'password'>>>({
      success: true,
      message: 'Customer created successfully',
      data: customerData as Omit<Customer, 'password'>
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating customer:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Failed to create customer',
      data: null
    }, { status: 500 });
  }
}
