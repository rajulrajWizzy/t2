// src/utils/fileUpload.ts
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { promises as fsPromises } from 'fs';

export type UploadType = 'profile-picture' | 'proof-of-identity' | 'proof-of-address';

// Base path for file uploads
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');

/**
 * Get the base path for uploads
 */
export function getUploadBasePath(): string {
  return UPLOAD_DIR;
}

/**
 * Get the full path to an uploaded file
 */
export function getUploadedFilePath(filePath: string): string {
  return path.join(UPLOAD_DIR, filePath);
}

/**
 * Save an uploaded file to disk
 * @param file The file to save
 * @param type The type of upload (profile-picture, proof-of-identity, proof-of-address)
 * @param userId The user ID or identifier
 * @returns The relative path to the saved file
 */
export async function saveUploadedFile(file: File, type: string, userId: string): Promise<string> {
  // Create the upload directory if it doesn't exist
  const uploadDir = path.join(UPLOAD_DIR, type, userId);
  await ensureDir(uploadDir);
  
  // Generate a unique filename
  const fileExtension = getFileExtension(file.name);
  const filename = `${uuidv4()}${fileExtension}`;
  const filePath = path.join(uploadDir, filename);
  
  // Convert File object to Buffer
  const buffer = Buffer.from(await file.arrayBuffer());
  
  // Write the file to disk
  await fsPromises.writeFile(filePath, buffer);
  
  // Return the relative path from the uploads directory
  return path.join(type, userId, filename);
}

/**
 * Save a base64 encoded image to disk
 * @param base64Data The base64 encoded image data
 * @param type The type of upload
 * @param customFilename Optional custom filename (without extension)
 * @returns The relative path to the saved file
 */
export async function saveBase64Image(
  base64Data: string,
  type: UploadType,
  customFilename?: string
): Promise<string> {
  // Create the upload directory if it doesn't exist
  const uploadDir = path.join(UPLOAD_DIR, type);
  await ensureDir(uploadDir);
  
  // Remove header if present (e.g., "data:image/jpeg;base64,")
  let data = base64Data;
  let extension = '.jpg'; // Default extension
  
  if (base64Data.includes('data:')) {
    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      throw new Error('Invalid base64 data format');
    }
    
    const mimeType = matches[1];
    data = matches[2];
    
    // Determine file extension from MIME type
    if (mimeType === 'image/png') {
      extension = '.png';
    } else if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
      extension = '.jpg';
    } else if (mimeType === 'application/pdf') {
      extension = '.pdf';
    } else {
      throw new Error(`Unsupported file type: ${mimeType}`);
    }
  }
  
  // Generate filename (either custom or UUID)
  const filename = `${customFilename || uuidv4()}${extension}`;
  const filePath = path.join(uploadDir, filename);
  
  // Decode and write the file
  const buffer = Buffer.from(data, 'base64');
  await fsPromises.writeFile(filePath, buffer);
  
  // Return the relative path
  return path.join(type, filename);
}

/**
 * Ensure a directory exists
 */
async function ensureDir(dir: string): Promise<void> {
  try {
    await fsPromises.mkdir(dir, { recursive: true });
  } catch (err) {
    console.error(`Error creating directory ${dir}:`, err);
    throw err;
  }
}

/**
 * Get file extension from filename
 */
function getFileExtension(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  return ext || '.jpg'; // Default to .jpg if no extension found
}