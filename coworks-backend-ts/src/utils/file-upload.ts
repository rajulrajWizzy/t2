import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { NextRequest } from 'next/server';

// Define file upload directories
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');
const PROFILE_PICTURES_DIR = path.join(UPLOAD_DIR, 'profile-pictures');
const PROOF_OF_IDENTITY_DIR = path.join(UPLOAD_DIR, 'proof-of-identity');
const PROOF_OF_ADDRESS_DIR = path.join(UPLOAD_DIR, 'proof-of-address');

// Ensure directories exist
const ensureDirectoriesExist = () => {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
  if (!fs.existsSync(PROFILE_PICTURES_DIR)) {
    fs.mkdirSync(PROFILE_PICTURES_DIR, { recursive: true });
  }
  if (!fs.existsSync(PROOF_OF_IDENTITY_DIR)) {
    fs.mkdirSync(PROOF_OF_IDENTITY_DIR, { recursive: true });
  }
  if (!fs.existsSync(PROOF_OF_ADDRESS_DIR)) {
    fs.mkdirSync(PROOF_OF_ADDRESS_DIR, { recursive: true });
  }
};

// Define allowed file types
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/jpg'];
const ALLOWED_DOCUMENT_TYPES = [...ALLOWED_IMAGE_TYPES, 'application/pdf'];

// Define maximum file sizes (in bytes)
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024; // 10MB

// Interface for file upload options
interface FileUploadOptions {
  allowedTypes: string[];
  maxSize: number;
  directory: string;
}

// Interface for file upload result
interface FileUploadResult {
  success: boolean;
  message?: string;
  filePath?: string;
  fileName?: string;
  fileUrl?: string;
}

/**
 * Process multipart form data from a NextRequest
 */
export async function processMultipartFormData(request: NextRequest): Promise<{ fields: any, files: any }> {
  ensureDirectoriesExist();
  
  const formData = await request.formData();
  const fields: any = {};
  const files: any = {};
  
  // Process each form field
  for (const [key, value] of formData.entries()) {
    // Check if it's a file
    if (value instanceof Blob) {
      const file = value as File;
      
      // Determine upload options based on field name
      let uploadOptions: FileUploadOptions;
      
      switch (key) {
        case 'profile_picture':
          uploadOptions = {
            allowedTypes: ALLOWED_IMAGE_TYPES,
            maxSize: MAX_IMAGE_SIZE,
            directory: PROFILE_PICTURES_DIR
          };
          break;
        case 'proof_of_identity':
          uploadOptions = {
            allowedTypes: ALLOWED_DOCUMENT_TYPES,
            maxSize: MAX_DOCUMENT_SIZE,
            directory: PROOF_OF_IDENTITY_DIR
          };
          break;
        case 'proof_of_address':
          uploadOptions = {
            allowedTypes: ALLOWED_DOCUMENT_TYPES,
            maxSize: MAX_DOCUMENT_SIZE,
            directory: PROOF_OF_ADDRESS_DIR
          };
          break;
        default:
          uploadOptions = {
            allowedTypes: ALLOWED_DOCUMENT_TYPES,
            maxSize: MAX_DOCUMENT_SIZE,
            directory: UPLOAD_DIR
          };
      }
      
      // Upload the file
      const uploadResult = await uploadFile(file, uploadOptions);
      files[key] = uploadResult;
    } else {
      // It's a regular form field
      fields[key] = value;
    }
  }
  
  return { fields, files };
}

/**
 * Upload a file to the server
 */
async function uploadFile(file: File, options: FileUploadOptions): Promise<FileUploadResult> {
  try {
    // Validate file type
    if (!options.allowedTypes.includes(file.type)) {
      return {
        success: false,
        message: `Invalid file type. Allowed types: ${options.allowedTypes.join(', ')}`
      };
    }
    
    // Validate file size
    if (file.size > options.maxSize) {
      return {
        success: false,
        message: `File too large. Maximum size: ${options.maxSize / (1024 * 1024)}MB`
      };
    }
    
    // Generate a unique filename
    const fileExtension = file.name.split('.').pop() || '';
    const fileName = `${uuidv4()}.${fileExtension}`;
    const filePath = path.join(options.directory, fileName);
    
    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Write file to disk
    fs.writeFileSync(filePath, buffer);
    
    // Generate public URL for the file
    const relativePath = path.relative(path.join(process.cwd(), 'public'), filePath);
    const fileUrl = `/${relativePath.replace(/\\/g, '/')}`;
    
    return {
      success: true,
      filePath,
      fileName,
      fileUrl
    };
  } catch (error) {
    console.error('File upload error:', error);
    return {
      success: false,
      message: 'Failed to upload file'
    };
  }
}

/**
 * Delete a file from the server
 */
export function deleteFile(filePath: string): boolean {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('File deletion error:', error);
    return false;
  }
}

/**
 * Get the full server path from a file URL
 */
export function getFullPathFromUrl(fileUrl: string): string {
  const relativePath = fileUrl.startsWith('/') ? fileUrl.substring(1) : fileUrl;
  return path.join(process.cwd(), 'public', relativePath);
}
