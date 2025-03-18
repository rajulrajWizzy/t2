import { NextRequest, NextResponse } from 'next/server';
import models from '@/models';
import { verifyToken } from '@/config/jwt';
import { ApiResponse } from '@/types/common';
import { Customer, UserRole } from '@/types/auth';
import bcrypt from 'bcryptjs';

// GET a single customer by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const { id } = params;
    
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
    
    // Retrieve the customer
    const customer = await models.Customer.findByPk(
      parseInt(id),
      { attributes: { exclude: ['password'] } }
    );
    
    if (!customer) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Customer not found',
        data: null
      }, { status: 404 });
    }
    
    // Branch admin can only view customers from their branch
    if (decoded.role === UserRole.BRANCH_ADMIN && decoded.managed_branch_id) {
      // Get bookings for the branch to see if this customer has booked there
      const branchBooking = await models.SeatBooking.findOne({
        where: { 
          branch_id: decoded.managed_branch_id,
          customer_id: customer.id
        }
      });
      
      if (!branchBooking) {
        return NextResponse.json<ApiResponse<null>>({
          success: false,
          message: 'You do not have permission to view this customer',
          data: null
        }, { status: 403 });
      }
    }
    
    return NextResponse.json<ApiResponse<Omit<Customer, 'password'>>>({
      success: true,
      message: 'Customer retrieved successfully',
      data: customer.get({ plain: true }) as Omit<Customer, 'password'>
    });
  } catch (error) {
    console.error('Error fetching customer:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Failed to fetch customer',
      data: null
    }, { status: 500 });
  }
}

// PUT update a customer
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const { id } = params;
    
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
    
    // Find the customer
    const customer = await models.Customer.findByPk(parseInt(id));
    
    if (!customer) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Customer not found',
        data: null
      }, { status: 404 });
    }
    
    // Branch admin can only update customers from their branch
    if (decoded.role === UserRole.BRANCH_ADMIN && decoded.managed_branch_id) {
      // Get bookings for the branch to see if this customer has booked there
      const branchBooking = await models.SeatBooking.findOne({
        where: { 
          branch_id: decoded.managed_branch_id,
          customer_id: customer.id
        }
      });
      
      if (!branchBooking) {
        return NextResponse.json<ApiResponse<null>>({
          success: false,
          message: 'You do not have permission to update this customer',
          data: null
        }, { status: 403 });
      }
    }
    
    // Parse request body
    const body = await request.json();
    const { 
      name, 
      email, 
      phone, 
      company_name, 
      profile_picture,
      role,
      password 
    } = body;
    
    // Prepare update object
    const updateData: any = {};
    
    if (name !== undefined) updateData.name = name;
    
    if (email !== undefined && email !== customer.email) {
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
      
      updateData.email = email;
    }
    
    if (phone !== undefined) updateData.phone = phone;
    if (company_name !== undefined) updateData.company_name = company_name;
    if (profile_picture !== undefined) updateData.profile_picture = profile_picture;
    
    // Handle role update
    if (role !== undefined) {
      // Only Super Admin can update roles to admin levels
      if (decoded.role !== UserRole.SUPER_ADMIN && 
          (role === UserRole.SUPER_ADMIN || role === UserRole.BRANCH_ADMIN)) {
        return NextResponse.json<ApiResponse<null>>({
          success: false,
          message: 'Only Super Admin can assign admin roles',
          data: null
        }, { status: 403 });
      }
      
      updateData.role = role;
    }
    
    // Handle password update
    if (password) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      updateData.password = hashedPassword;
    }
    
    // Update customer
    await customer.update(updateData);
    
    // Return updated customer data without password
    const updatedCustomer = await models.Customer.findByPk(
      parseInt(id),
      { attributes: { exclude: ['password'] } }
    );
    
    return NextResponse.json<ApiResponse<Omit<Customer, 'password'>>>({
      success: true,
      message: 'Customer updated successfully',
      data: updatedCustomer!.get({ plain: true }) as Omit<Customer, 'password'>
    });
  } catch (error) {
    console.error('Error updating customer:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Failed to update customer',
      data: null
    }, { status: 500 });
  }
}

// DELETE a customer
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const { id } = params;
    
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
    
    // Only super admin can delete customers
    if (decoded.role !== UserRole.SUPER_ADMIN) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Only Super Admin can delete customers',
        data: null
      }, { status: 403 });
    }
    
    // Find the customer
    const customer = await models.Customer.findByPk(parseInt(id));
    
    if (!customer) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Customer not found',
        data: null
      }, { status: 404 });
    }
    
    // Delete customer
    await customer.destroy();
    
    return NextResponse.json<ApiResponse<null>>({
      success: true,
      message: 'Customer deleted successfully',
      data: null
    });
  } catch (error) {
    console.error('Error deleting customer:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Failed to delete customer',
      data: null
    }, { status: 500 });
  }
}
