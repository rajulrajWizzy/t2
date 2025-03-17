import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/config/jwt';
import models from '@/models';
import { ApiResponse } from '@/types/common';
import { Customer } from '@/types/auth';
import { hashPassword } from '@/utils/auth';
import validation from '@/utils/validation';

// GET current user profile
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Verify token
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Unauthorized',
        data: null
      }, { status: 401 });
    }

    const { valid, decoded } = await verifyToken(token);
    if (!valid || !decoded) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Invalid token',
        data: null
      }, { status: 401 });
    }

    // Get user profile
    const customer = await models.Customer.findByPk(decoded.id, {
      attributes: { 
        exclude: ['password'],
        include: [
          'id', 'name', 'email', 'phone', 'profile_picture', 
          'company_name', 'role', 'managed_branch_id', 'is_admin',
          'created_at', 'updated_at'
        ]
      }
    });

    if (!customer) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Customer not found',
        data: null
      }, { status: 404 });
    }

    const customerData = customer.get({ plain: true }) as Omit<Customer, 'password'>;

    return NextResponse.json<ApiResponse<Omit<Customer, 'password'>>>({
      success: true,
      message: 'Profile retrieved successfully',
      data: customerData
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Failed to fetch profile',
      data: null
    }, { status: 500 });
  }
}

// PUT update user profile
export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    // Verify token
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Unauthorized',
        data: null
      }, { status: 401 });
    }

    const { valid, decoded } = await verifyToken(token);
    if (!valid || !decoded) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Invalid token',
        data: null
      }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { name, email, current_password, new_password } = body;

    // Validate input
    if (!name && !email && !new_password) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'At least one field must be provided for update',
        data: null
      }, { status: 400 });
    }

    // Get current user
    const customer = await models.Customer.findByPk(decoded.id);
    if (!customer) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Customer not found',
        data: null
      }, { status: 404 });
    }

    // Prepare update data
    const updateData: any = {};

    // Update name if provided
    if (name) {
      if (!validation.isValidName(name)) {
        return NextResponse.json<ApiResponse<null>>({
          success: false,
          message: 'Invalid name format',
          data: null
        }, { status: 400 });
      }
      updateData.name = name;
    }

    // Update email if provided
    if (email) {
      if (!validation.isValidEmail(email)) {
        return NextResponse.json<ApiResponse<null>>({
          success: false,
          message: 'Invalid email format',
          data: null
        }, { status: 400 });
      }

      // Check if email is already taken
      const existingCustomer = await models.Customer.findOne({
        where: { email, id: { [models.Sequelize.Op.ne]: decoded.id } }
      });

      if (existingCustomer) {
        return NextResponse.json<ApiResponse<null>>({
          success: false,
          message: 'Email is already in use',
          data: null
        }, { status: 400 });
      }

      updateData.email = email;
    }

    // Update password if provided
    if (new_password) {
      if (!current_password) {
        return NextResponse.json<ApiResponse<null>>({
          success: false,
          message: 'Current password is required to update password',
          data: null
        }, { status: 400 });
      }

      // Verify current password
      const isPasswordValid = await customer.validatePassword(current_password);
      if (!isPasswordValid) {
        return NextResponse.json<ApiResponse<null>>({
          success: false,
          message: 'Current password is incorrect',
          data: null
        }, { status: 400 });
      }

      // Validate new password
      if (!validation.isValidPassword(new_password)) {
        return NextResponse.json<ApiResponse<null>>({
          success: false,
          message: 'Invalid password format. Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number.',
          data: null
        }, { status: 400 });
      }

      updateData.password = await hashPassword(new_password);
    }

    // Update customer
    await customer.update(updateData);

    // Get updated customer without password
    const updatedCustomer = await models.Customer.findByPk(decoded.id, {
      attributes: { 
        exclude: ['password'],
        include: [
          'id', 'name', 'email', 'phone', 'profile_picture', 
          'company_name', 'role', 'managed_branch_id', 'is_admin',
          'created_at', 'updated_at'
        ]
      }
    });

    if (!updatedCustomer) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Failed to retrieve updated profile',
        data: null
      }, { status: 500 });
    }

    const updatedCustomerData = updatedCustomer.get({ plain: true }) as Omit<Customer, 'password'>;

    return NextResponse.json<ApiResponse<Omit<Customer, 'password'>>>({
      success: true,
      message: 'Profile updated successfully',
      data: updatedCustomerData
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Failed to update profile',
      data: null
    }, { status: 500 });
  }
}