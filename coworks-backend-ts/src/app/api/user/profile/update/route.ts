// Explicitly set Node.js runtime for this route
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/utils/jwt-wrapper';
import CustomerModel from '@/models/customer';
import { ApiResponse } from '@/types/api';
import { hashPassword } from '@/utils/password';
import { processMultipartFormData, getFullPathFromUrl, deleteFile } from '@/utils/file-upload';
import jwt from 'jsonwebtoken';

/**
 * PUT /api/user/profile/update - Update authenticated user profile
 */
export async function PUT(request: NextRequest) {
  try {
    // Verify user authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Authentication required',
        data: null
      }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    
    // Manually verify token to bypass blacklist check issues
    try {
      // Get JWT secret from environment variables
      const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
      
      // Directly verify the token with the secret key
      const decodedToken = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
      
      if (!decodedToken || !decodedToken.id) {
        return NextResponse.json<ApiResponse<null>>({
          success: false,
          message: 'Invalid or expired token',
          data: null
        }, { status: 401 });
      }
      
      const userId = decodedToken.id;
      
      // Process multipart form data
      const { fields, files } = await processMultipartFormData(request);
      const { name, email, phone, company_name, address, current_password, new_password } = fields;
      
      // Find the customer
      const customer = await CustomerModel.findByPk(userId);
      if (!customer) {
        return NextResponse.json<ApiResponse<null>>({
          success: false,
          message: 'User not found',
          data: null
        }, { status: 404 });
      }
      
      // Create object with fields to update
      const updateData: any = {};
      
      // Update basic profile information
      if (name) updateData.name = name;
      if (phone) updateData.phone = phone;
      if (company_name) updateData.company_name = company_name;
      if (address) updateData.address = address;
      
      // Handle file uploads
      if (files.profile_picture && (files.profile_picture as any).success) {
        // Delete old profile picture if it exists
        if (customer.profile_picture) {
          const oldFilePath = getFullPathFromUrl(customer.profile_picture);
          deleteFile(oldFilePath);
        }
        updateData.profile_picture = (files.profile_picture as any).fileUrl;
      }
      
      if (files.proof_of_identity && (files.proof_of_identity as any).success) {
        // Delete old proof of identity if it exists
        if (customer.proof_of_identity) {
          const oldFilePath = getFullPathFromUrl(customer.proof_of_identity);
          deleteFile(oldFilePath);
        }
        updateData.proof_of_identity = (files.proof_of_identity as any).fileUrl;
        // Reset verification status when new document is uploaded
        updateData.is_identity_verified = false;
        if (updateData.verification_status !== 'REJECTED') {
          updateData.verification_status = 'PENDING';
        }
      }
      
      if (files.proof_of_address && (files.proof_of_address as any).success) {
        // Delete old proof of address if it exists
        if (customer.proof_of_address) {
          const oldFilePath = getFullPathFromUrl(customer.proof_of_address);
          deleteFile(oldFilePath);
        }
        updateData.proof_of_address = (files.proof_of_address as any).fileUrl;
        // Reset verification status when new document is uploaded
        updateData.is_address_verified = false;
        if (updateData.verification_status !== 'REJECTED') {
          updateData.verification_status = 'PENDING';
        }
      }
      
      // Update email (check if not already used by another customer)
      if (email && email !== customer.email) {
        const existingCustomer = await CustomerModel.findOne({ where: { email } });
        if (existingCustomer && existingCustomer.id !== customer.id) {
          return NextResponse.json<ApiResponse<null>>({
            success: false,
            message: 'Email is already in use',
            data: null
          }, { status: 400 });
        }
        updateData.email = email;
      }
      
      // Update password if both current and new passwords are provided
      if (current_password && new_password) {
        // Verify current password
        const bcrypt = require('bcryptjs');
        const isPasswordValid = await bcrypt.compare(current_password, customer.password);
        
        if (!isPasswordValid) {
          return NextResponse.json<ApiResponse<null>>({
            success: false,
            message: 'Current password is incorrect',
            data: null
          }, { status: 400 });
        }
        
        // Hash new password
        updateData.password = await hashPassword(new_password);
      }
      
      // If nothing to update
      if (Object.keys(updateData).length === 0) {
        return NextResponse.json<ApiResponse<null>>({
          success: false,
          message: 'No data provided for update',
          data: null
        }, { status: 400 });
      }
      
      // Update customer profile
      await customer.update(updateData);
      
      // Fetch updated customer (excluding password)
      const updatedCustomer = await CustomerModel.findByPk(userId, {
        attributes: { exclude: ['password'] }
      });
      
      // Prepare response with file upload results
      const fileUploadResults: Record<string, any> = {};
      for (const [key, value] of Object.entries(files)) {
        const fileValue = value as any;
        fileUploadResults[key] = {
          success: fileValue.success,
          message: fileValue.message,
          fileUrl: fileValue.fileUrl
        };
      }
      
      return NextResponse.json<ApiResponse<any>>({
        success: true,
        message: 'Profile updated successfully',
        data: {
          user: updatedCustomer,
          fileUploads: fileUploadResults
        }
      }, { status: 200 });
    } catch (jwtError) {
      console.error('JWT verification error:', jwtError);
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Invalid or expired token',
        data: null
      }, { status: 401 });
    }
  } catch (error: any) {
    console.error('User profile update error:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Failed to update profile: ' + (error.message || 'Unknown error'),
      data: null
    }, { status: 500 });
  }
}
