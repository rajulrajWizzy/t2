// src/app/api/profile/route.ts
import { NextRequest, NextResponse } from 'next/server';
import models from '@/models';
import { verifyToken } from '@/utils/jwt';
import { ApiResponse } from '@/types/common';
import validation from '@/utils/validation';
import { saveUploadedFile } from '@/utils/fileUpload';
import path from 'path';
import { formatObjectImages } from '@/utils/formatImageUrl';

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
    
    // Format image URLs to be fully accessible
    const formattedCustomer = formatObjectImages(
      customerWithoutPassword,
      ['profile_picture', 'proof_of_identity', 'proof_of_address'],
      request
    );
    
    // Add debugging information
    console.log('Original profile_picture:', customerWithoutPassword.profile_picture);
    console.log('Formatted profile_picture:', formattedCustomer.profile_picture);
    
    return NextResponse.json<ApiResponse<any>>({
      success: true,
      message: 'Profile retrieved successfully',
      data: formattedCustomer
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
    
    // Check if request is multipart/form-data
    const contentType = request.headers.get('content-type') || '';
    
    // Prepare update data
    const updateData: any = {};
    
    if (contentType.includes('multipart/form-data')) {
      // Handle multipart form data
      try {
        const formData = await request.formData();
        
        // Extract text fields
        if (formData.has('name')) {
          const name = formData.get('name') as string;
          if (!validation.isValidName(name)) {
            return NextResponse.json<ApiResponse<null>>({
              success: false,
              message: 'Name cannot be empty or contain only whitespace',
              data: null
            }, { status: 400 });
          }
          updateData.name = name;
        }
        
        if (formData.has('phone')) {
          const phone = formData.get('phone') as string;
          if (phone && !validation.isValidPhone(phone)) {
            return NextResponse.json<ApiResponse<null>>({
              success: false,
              message: 'Phone number must be 10 digits',
              data: null
            }, { status: 400 });
          }
          updateData.phone = phone;
        }
        
        if (formData.has('company_name')) {
          const companyName = formData.get('company_name') as string;
          if (!validation.isValidName(companyName)) {
            return NextResponse.json<ApiResponse<null>>({
              success: false,
              message: 'Company name cannot be empty or contain only whitespace',
              data: null
            }, { status: 400 });
          }
          updateData.company_name = companyName;
        }
        
        if (formData.has('address')) {
          const address = formData.get('address') as string;
          if (address && !validation.isValidAddress(address)) {
            return NextResponse.json<ApiResponse<null>>({
              success: false,
              message: 'Address cannot be empty or contain only whitespace',
              data: null
            }, { status: 400 });
          }
          updateData.address = address;
        }
        
        // Handle file uploads
        if (formData.has('profile_picture')) {
          const file = formData.get('profile_picture') as File;
          if (file && file.size > 0) {
            // Save profile picture
            const filePath = await saveUploadedFile(file, 'profile-pictures', customer.id.toString());
            updateData.profile_picture = filePath;
          }
        }
        
        if (formData.has('proof_of_identity')) {
          const file = formData.get('proof_of_identity') as File;
          if (file && file.size > 0) {
            // Save proof of identity
            const filePath = await saveUploadedFile(file, 'proof-of-identity', customer.id.toString());
            updateData.proof_of_identity = filePath;
          }
        }
        
        if (formData.has('proof_of_address')) {
          const file = formData.get('proof_of_address') as File;
          if (file && file.size > 0) {
            // Save proof of address
            const filePath = await saveUploadedFile(file, 'proof-of-address', customer.id.toString());
            updateData.proof_of_address = filePath;
          }
        }
      } catch (formError) {
        return NextResponse.json<ApiResponse<null>>({
          success: false,
          message: 'Failed to process form data',
          data: null,
          error: (formError as Error).message
        }, { status: 400 });
      }
    } else {
      // Handle JSON data
      try {
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
          updateData.proof_of_identity = proof_of_identity;
        }
        
        // Validate and add proof of address if provided
        if (proof_of_address !== undefined) {
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
      } catch (jsonError) {
        return NextResponse.json<ApiResponse<null>>({
          success: false,
          message: 'Failed to parse JSON data',
          data: null,
          error: (jsonError as Error).message
        }, { status: 400 });
      }
    }
    
    // If nothing to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'No data provided for update',
        data: null
      }, { status: 400 });
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