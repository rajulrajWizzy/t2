// Explicitly set Node.js runtime for this route
export const runtime = "nodejs";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/utils/jwt-wrapper';
import models from '@/models';
import { ApiResponse } from '@/types/common';
import validation from '@/utils/validation';
import { hashPassword } from '@/utils/password';
import bcrypt from 'bcryptjs';

// Add CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/**
 * PUT /api/profile/update - Update authenticated user profile
 */
export async function PUT(request: NextRequest) {
  try {
    // Use verifyAuth helper for token verification
    const authResult = await verifyAuth(request);
    
    // Check if the result is a NextResponse (error)
    if (authResult instanceof NextResponse) {
      // Add CORS headers
      const response = authResult.clone();
      const newHeaders = new Headers(response.headers);
      Object.entries(corsHeaders).forEach(([key, value]) => {
        newHeaders.set(key, value);
      });
      
      return new NextResponse(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders
      });
    }
    
    // Now authResult contains the decoded token payload
    const userId = authResult.id;
    
    // Parse request body
    const body = await request.json();
    const { 
      name, 
      email, 
      phone,
      company_name,
      address,
      current_password, 
      new_password, 
      profile_picture,
      proof_of_identity,
      proof_of_address
    } = body;
    
    // Find the user
    const user = await models.Customer.findByPk(userId);
    if (!user) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'User not found',
        data: null
      }, { status: 404, headers: corsHeaders });
    }
    
    // Create object with fields to update
    const updateData: any = {};
    
    // Update basic profile information
    if (name !== undefined) {
      if (!validation.isValidName(name)) {
        return NextResponse.json<ApiResponse<null>>({
          success: false,
          message: 'Name cannot be empty or contain only whitespace',
          data: null
        }, { status: 400, headers: corsHeaders });
      }
      updateData.name = name;
    }
    
    if (phone !== undefined) {
      if (phone && !validation.isValidPhone(phone)) {
        return NextResponse.json<ApiResponse<null>>({
          success: false,
          message: 'Phone number must be 10 digits',
          data: null
        }, { status: 400, headers: corsHeaders });
      }
      updateData.phone = phone;
    }
    
    if (company_name !== undefined) {
      if (!validation.isValidName(company_name)) {
        return NextResponse.json<ApiResponse<null>>({
          success: false,
          message: 'Company name cannot be empty or contain only whitespace',
          data: null
        }, { status: 400, headers: corsHeaders });
      }
      updateData.company_name = company_name;
    }
    
    if (address !== undefined) {
      if (address && !validation.isValidAddress(address)) {
        return NextResponse.json<ApiResponse<null>>({
          success: false,
          message: 'Address cannot be empty or contain only whitespace',
          data: null
        }, { status: 400, headers: corsHeaders });
      }
      updateData.address = address;
    }
    
    if (profile_picture !== undefined) {
      updateData.profile_picture = profile_picture;
    }
    
    if (proof_of_identity !== undefined) {
      if (proof_of_identity && !validation.isValidDocumentPath(proof_of_identity)) {
        return NextResponse.json<ApiResponse<null>>({
          success: false,
          message: 'Proof of identity must be a PDF, JPG, JPEG, or PNG file',
          data: null
        }, { status: 400, headers: corsHeaders });
      }
      updateData.proof_of_identity = proof_of_identity;
      // When proof of identity is updated, reset verification flags
      updateData.is_identity_verified = false;
      updateData.verification_status = 'PENDING';
    }
    
    if (proof_of_address !== undefined) {
      if (proof_of_address && !validation.isValidDocumentPath(proof_of_address)) {
        return NextResponse.json<ApiResponse<null>>({
          success: false,
          message: 'Proof of address must be a PDF, JPG, JPEG, or PNG file',
          data: null
        }, { status: 400, headers: corsHeaders });
      }
      updateData.proof_of_address = proof_of_address;
      // When proof of address is updated, reset verification flags
      updateData.is_address_verified = false;
      updateData.verification_status = 'PENDING';
    }
    
    // Update email (check if not already used by another user)
    if (email && email !== user.email) {
      // Validate email format
      if (!validation.isValidEmail(email)) {
        return NextResponse.json<ApiResponse<null>>({
          success: false,
          message: 'Invalid email format',
          data: null
        }, { status: 400, headers: corsHeaders });
      }
      
      const existingUser = await models.Customer.findOne({ where: { email } });
      if (existingUser && existingUser.id !== user.id) {
        return NextResponse.json<ApiResponse<null>>({
          success: false,
          message: 'Email is already in use',
          data: null
        }, { status: 400, headers: corsHeaders });
      }
      updateData.email = email;
    }
    
    // Update password if both current and new passwords are provided
    if (current_password && new_password) {
      // Verify current password
      const isPasswordValid = await bcrypt.compare(current_password, user.password);
      if (!isPasswordValid) {
        return NextResponse.json<ApiResponse<null>>({
          success: false,
          message: 'Current password is incorrect',
          data: null
        }, { status: 400, headers: corsHeaders });
      }
      
      // Validate new password
      if (!validation.isValidPassword(new_password)) {
        return NextResponse.json<ApiResponse<null>>({
          success: false,
          message: 'Password must be at least 8 characters and include at least one uppercase letter, one lowercase letter, one number, and one special character',
          data: null
        }, { status: 400, headers: corsHeaders });
      }
      
      // Hash new password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(new_password, salt);
      updateData.password = hashedPassword;
    }
    
    // If nothing to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'No data provided for update',
        data: null
      }, { status: 400, headers: corsHeaders });
    }
    
    // Update user profile
    await user.update(updateData);
    
    // Fetch updated user data (excluding password)
    const updatedUserData = user.get({ plain: true });
    const { password, ...userWithoutPassword } = updatedUserData;
    
    // Prepare verification summary
    const isProfileComplete = 
      !!userWithoutPassword.proof_of_identity && 
      !!userWithoutPassword.proof_of_address && 
      !!userWithoutPassword.address;
    
    // If verification_status is APPROVED, user can make bookings regardless of other flags
    const canMakeBookings = userWithoutPassword.verification_status === 'APPROVED' || 
      (isProfileComplete && 
       userWithoutPassword.is_identity_verified &&
       userWithoutPassword.is_address_verified);
    
    // Add verification message if relevant
    let verificationMessage = null;
    
    // Missing documents
    const missingItems = [];
    if (!userWithoutPassword.proof_of_identity) {
      missingItems.push('proof of identity');
    }
    if (!userWithoutPassword.proof_of_address) {
      missingItems.push('proof of address');
    }
    
    // Return success response with updated user data
    return NextResponse.json<ApiResponse<any>>({
      success: true,
      message: 'Profile updated successfully',
      data: {
        ...userWithoutPassword,
        verification_summary: {
          is_profile_complete: isProfileComplete,
          can_make_bookings: canMakeBookings,
          missing_items: missingItems.length > 0 ? missingItems : null,
          verification_message: verificationMessage
        }
      }
    }, { status: 200, headers: corsHeaders });
  } catch (error) {
    console.error('Error updating profile:', error);
    
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Failed to update profile',
      data: null,
      error: (error as Error).message
    }, { status: 500, headers: corsHeaders });
  }
}

// OPTIONS request for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders
  });
} 