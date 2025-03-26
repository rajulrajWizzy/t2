import fs from 'fs';
import path from 'path';
import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

// Define formidable types since we can't directly import them
interface FormidableFile {
  filepath: string;
  originalFilename?: string;
  mimetype?: string;
  size?: number;
}

interface FormidableFiles {
  [key: string]: FormidableFile | FormidableFile[];
}

interface FormidableFields {
  [key: string]: string | string[];
}

// Define the types of uploads we support
export type UploadType = 
  | 'profile-picture'
  | 'branch-image'
  | 'proof-of-identity'
  | 'proof-of-address';

// Configuration for uploads
const config = {
  maxFileSize: 5 * 1024 * 1024, // 5MB
  allowedMimeTypes: {
    'profile-picture': ['image/jpeg', 'image/png', 'image/webp'],
    'branch-image': ['image/jpeg', 'image/png', 'image/webp'],
    'proof-of-identity': ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    'proof-of-address': ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
  },
  directories: {
    'profile-picture': 'profile-pictures',
    'branch-image': 'branch-images',
    'proof-of-identity': 'proof-of-identity',
    'proof-of-address': 'proof-of-address'
  }
};

/**
 * Parse a multipart form request
 * Note: This function will need to be implemented when needed
 * We're defining the types to avoid lint errors
 */
export async function parseForm(req: NextRequest): Promise<{ fields: FormidableFields; files: FormidableFiles }> {
  // This will be implemented later when formidable is correctly set up for NextRequest
  // For now, this is a placeholder to satisfy TypeScript
  return { fields: {}, files: {} };
}

/**
 * Get the base path for uploads
 */
export function getUploadBasePath(): string {
  return path.resolve(process.cwd(), 'uploads');
}

/**
 * Save an uploaded file to the appropriate directory
 */
export async function saveUploadedFile(
  file: FormidableFile,
  uploadType: UploadType,
  customFilename?: string
): Promise<string> {
  // Validate mime type
  const allowedMimeTypes = config.allowedMimeTypes[uploadType];
  if (!file.mimetype || !allowedMimeTypes.includes(file.mimetype)) {
    throw new Error(
      `Invalid file type. Allowed types: ${allowedMimeTypes.join(', ')}`
    );
  }

  // Create directory if it doesn't exist
  const uploadDir = path.join(getUploadBasePath(), config.directories[uploadType]);
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // Generate a unique filename
  const fileExtension = path.extname(file.originalFilename || '');
  const filename = customFilename || `${uuidv4()}${fileExtension}`;
  const destPath = path.join(uploadDir, filename);

  // Copy the file to the destination
  const fileData = fs.readFileSync(file.filepath);
  fs.writeFileSync(destPath, fileData);

  // Clean up the temp file
  fs.unlinkSync(file.filepath);

  // Return the relative path for database storage
  return path.join(config.directories[uploadType], filename);
}

/**
 * Delete a file from the uploads directory
 */
export function deleteUploadedFile(relativePath: string): void {
  if (!relativePath) return;

  const fullPath = path.join(getUploadBasePath(), relativePath);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }
}

/**
 * Get the full path of an uploaded file
 */
export function getUploadedFilePath(relativePath: string): string {
  return path.join(getUploadBasePath(), relativePath);
}

/**
 * Process a base64 image and save it to the file system
 */
export async function saveBase64Image(
  base64String: string,
  uploadType: UploadType,
  customFilename?: string
): Promise<string> {
  // Extract the MIME type and data
  const matches = base64String.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    throw new Error('Invalid base64 string');
  }

  const mimeType = matches[1];
  const data = matches[2];
  const buffer = Buffer.from(data, 'base64');

  // Validate MIME type
  const allowedMimeTypes = config.allowedMimeTypes[uploadType];
  if (!allowedMimeTypes.includes(mimeType)) {
    throw new Error(
      `Invalid file type. Allowed types: ${allowedMimeTypes.join(', ')}`
    );
  }

  // Create directory if it doesn't exist
  const uploadDir = path.join(getUploadBasePath(), config.directories[uploadType]);
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // Generate extension from mime type
  const extensions: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'application/pdf': '.pdf'
  };
  const extension = extensions[mimeType] || '.bin';

  // Generate filename
  const filename = customFilename || `${uuidv4()}${extension}`;
  const destPath = path.join(uploadDir, filename);

  // Write the file
  fs.writeFileSync(destPath, buffer);

  // Return the relative path for database storage
  return path.join(config.directories[uploadType], filename);
} 