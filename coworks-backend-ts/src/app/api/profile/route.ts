import { NextRequest, NextResponse } from 'next/server';
import models from '@/models';
import { verifyToken } from '@/config/jwt';
import { ApiResponse } from '@/types/common';
import validation from '@/utils/validation';

// GET current user profile
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
    
    // Return customer data without password
    const customerData = customer.get({ plain: true });
    const { password, ...customerWithoutPassword } = customerData;
    
    return NextResponse.json<ApiResponse<any>>({
      success: true,
      message: 'Profile retrieved successfully',
      data: customerWithoutPassword
    });
  } catch (error) {
    console.error('Error retrieving profile:', error);
    
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Failed to retrieve profile',
      data: null,
      error: (error as Error).message
    }, { status: 500 });
  }
}

// PATCH update user profile
export async function PATCH(request: NextRequest): Promise<NextResponse> {
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
    
    // Parse the request body
    const body = await request.json();
    const { 
      name, 
      phone, 
      profile_picture, 
      company_name, 
      proof_of_identity, 
      proof_of_address, 
      address 
    } = body;
    
    // Prepare update data
    const updateData: any = {};
    
    // Validate and add name if provided
    if (name !== undefined) {
      if (!name) {
        return NextResponse.json<ApiResponse<null>>({
          success: false,
          message: 'Name is required',
          data: null
        }, { status: 400 });
      }
      
      // Name validation - check for blank or whitespace-only names
      if (!validation.isValidName(name)) {
        return NextResponse.json<ApiResponse<null>>({
          success: false,
          message: 'Name cannot be empty or contain only whitespace',
          data: null
        }, { status: 400 });
      }
      
      updateData.name = name;
    }
    
    // Validate and add phone if provided
    if (phone !== undefined) {
      if (phone && !validation.isValidPhone(phone)) {
        return NextResponse.json<ApiResponse<null>>({
          success: false,
          message: 'Phone number must be 10 digits',
          data: null
        }, { status: 400 });
      }
      
      updateData.phone = phone;
    }
    
    // Add profile_picture if provided
    if (profile_picture !== undefined) {
      updateData.profile_picture = profile_picture;
    }
    
    // Add company_name if provided
    if (company_name !== undefined) {
      // Company name validation
      if (!company_name) {
        return NextResponse.json<ApiResponse<null>>({
          success: false,
          message: 'Company name is required',
          data: null
        }, { status: 400 });
      }
      
      if (!validation.isValidName(company_name)) {
        return NextResponse.json<ApiResponse<null>>({
          success: false,
          message: 'Company name cannot be empty or contain only whitespace',
          data: null
        }, { status: 400 });
      }
      
      updateData.company_name = company_name;
    }
    
    // Validate and add proof of identity if provided
    if (proof_of_identity !== undefined) {
      if (proof_of_identity && !validation.isValidDocumentPath(proof_of_identity)) {
        return NextResponse.json<ApiResponse<null>>({
          success: false,
          message: 'Proof of identity must be a PDF, JPG, JPEG, or PNG file',
          data: null
        }, { status: 400 });
      }
      
      updateData.proof_of_identity = proof_of_identity;
    }
    
    // Validate and add proof of address if provided
    if (proof_of_address !== undefined) {
      if (proof_of_address && !validation.isValidDocumentPath(proof_of_address)) {
        return NextResponse.json<ApiResponse<null>>({
          success: false,
          message: 'Proof of address must be a PDF, JPG, JPEG, or PNG file',
          data: null
        }, { status: 400 });
      }
      
      updateData.proof_of_address = proof_of_address;
    }
    
    // Validate and add address if provided
    if (address !== undefined) {
      if (address && !validation.isValidAddress(address)) {
        return NextResponse.json<ApiResponse<null>>({
          success: false,
          message: 'Address cannot be empty or contain only whitespace',
          data: null
        }, { status: 400 });
      }
      
      updateData.address = address;
    }
    
    // Update the customer
    await customer.update(updateData);
    
    // Return updated customer data without password
    const updatedCustomerData = customer.get({ plain: true });
    const { password, ...customerWithoutPassword } = updatedCustomerData;
    
    return NextResponse.json<ApiResponse<any>>({
      success: true,
      message: 'Profile updated successfully',
      data: customerWithoutPassword
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Failed to update profile',
      data: null,
      error: (error as Error).message
    }, { status: 500 });
  }
} 