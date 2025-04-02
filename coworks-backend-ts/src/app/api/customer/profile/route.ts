// Explicitly set Node.js runtime for this route
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, corsHeaders } from '@/utils/jwt-wrapper';
import models from '@/models';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('Customer profile API GET called');

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

    // Get customer profile
    try {
      if (models && models.sequelize) {
        await models.sequelize.authenticate();
        console.log('Database connection is active for customer profile fetch');
        
        // Get customer profile from database
        const customerId = decoded.id;
        const customer = await models.Customer.findByPk(customerId, {
          attributes: { 
            exclude: ['password', 'reset_token', 'reset_token_expiry'] 
          }
        });
        
        if (!customer) {
          return NextResponse.json(
            { success: false, message: 'Customer not found' },
            { status: 404, headers: corsHeaders }
          );
        }
        
        return NextResponse.json(
          { 
            success: true, 
            message: 'Customer profile retrieved successfully',
            data: customer
          },
          { status: 200, headers: corsHeaders }
        );
      } else {
        throw new Error('Sequelize models not initialized');
      }
    } catch (dbError) {
      console.error('Database error in customer profile GET:', dbError);
      throw dbError;
    }
  } catch (error) {
    console.error('Error in customer profile route:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to retrieve customer profile', error: (error as Error).message },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('Customer profile API PUT called');

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

    // Get customer ID from token
    const customerId = decoded.id;
    
    // Process form data (multipart/form-data)
    const formData = await request.formData();
    const updatedProfile: Record<string, any> = {};
    
    // Extract text fields
    const textFields = [
      'name', 'email', 'phone', 'address', 'city', 
      'state', 'country', 'postal_code', 'company_name', 
      'tax_id', 'organization_size', 'industry'
    ];
    
    for (const field of textFields) {
      const value = formData.get(field);
      if (value !== null && value !== undefined) {
        updatedProfile[field] = value.toString();
      }
    }
    
    // Handle file uploads for identity and address documents
    const identityDocument = formData.get('identity_document') as File;
    const addressDocument = formData.get('address_document') as File;
    
    // Process identity document
    if (identityDocument) {
      try {
        // Here you would upload the file to your storage service (S3, Azure, etc.)
        // For this example, we'll simulate storing the file and just save the URL
        
        // In a real implementation, replace this with actual file upload code
        const identityDocumentUrl = await simulateFileUpload(identityDocument, customerId, 'identity');
        updatedProfile.identity_document_url = identityDocumentUrl;
      } catch (uploadError) {
        console.error('Error uploading identity document:', uploadError);
        return NextResponse.json(
          { success: false, message: 'Failed to upload identity document' },
          { status: 500, headers: corsHeaders }
        );
      }
    }
    
    // Process address document
    if (addressDocument) {
      try {
        // Here you would upload the file to your storage service
        // For this example, we'll simulate storing the file and just save the URL
        
        // In a real implementation, replace this with actual file upload code
        const addressDocumentUrl = await simulateFileUpload(addressDocument, customerId, 'address');
        updatedProfile.address_document_url = addressDocumentUrl;
      } catch (uploadError) {
        console.error('Error uploading address document:', uploadError);
        return NextResponse.json(
          { success: false, message: 'Failed to upload address document' },
          { status: 500, headers: corsHeaders }
        );
      }
    }
    
    // Update customer profile in database
    try {
      if (models && models.sequelize) {
        await models.sequelize.authenticate();
        console.log('Database connection is active for customer profile update');
        
        // Find the customer
        const customer = await models.Customer.findByPk(customerId);
        
        if (!customer) {
          return NextResponse.json(
            { success: false, message: 'Customer not found' },
            { status: 404, headers: corsHeaders }
          );
        }
        
        // Update customer profile
        await customer.update(updatedProfile);
        
        // Fetch updated profile with excluded sensitive fields
        const updatedCustomer = await models.Customer.findByPk(customerId, {
          attributes: { 
            exclude: ['password', 'reset_token', 'reset_token_expiry'] 
          }
        });
        
        return NextResponse.json(
          { 
            success: true, 
            message: 'Customer profile updated successfully',
            data: updatedCustomer
          },
          { status: 200, headers: corsHeaders }
        );
      } else {
        throw new Error('Sequelize models not initialized');
      }
    } catch (dbError) {
      console.error('Database error in customer profile update:', dbError);
      throw dbError;
    }
  } catch (error) {
    console.error('Error in customer profile update route:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update customer profile', error: (error as Error).message },
      { status: 500, headers: corsHeaders }
    );
  }
}

async function simulateFileUpload(file: File, customerId: string | number, type: string): Promise<string> {
  // This is a placeholder for actual file upload logic
  // In a real implementation, you would:
  // 1. Generate a unique file name
  // 2. Upload to a storage service like S3, Azure Blob Storage, etc.
  // 3. Return the URL of the uploaded file
  
  const fileName = file.name;
  const fileType = fileName.split('.').pop()?.toLowerCase() || 'unknown';
  const timestamp = new Date().getTime();
  const uniqueFileName = `${customerId}_${type}_${timestamp}.${fileType}`;
  
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // In a real implementation, return the actual URL from your storage service
  return `https://storage.example.com/documents/${uniqueFileName}`;
}

export async function OPTIONS(request: NextRequest): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders
  });
} 