import { Request } from 'express';

// Define file upload request types
export interface FileUploadRequest extends Request {
  file?: Express.Multer.File;
  files?: {
    [fieldname: string]: Express.Multer.File[];
  };
}

// Define profile update with file types
export interface ProfileUpdateData {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address?: string;
  profilePicture?: Express.Multer.File;
  proofOfIdentity?: Express.Multer.File;
  proofOfAddress?: Express.Multer.File;
}

// Define registration with file types
export interface RegistrationData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  address: string;
  profilePicture?: Express.Multer.File;
}

// Define file upload response type
export interface FileUploadResponse {
  success: boolean;
  message: string;
  data?: {
    filePath?: string;
    fileUrl?: string;
  };
  error?: string;
}