import fs from 'fs';
import path from 'path';
import { promises as fsPromises } from 'fs';

// Define upload types
export type UploadType = 'profile-pictures' | 'proof-of-identity' | 'proof-of-address' | 'branch-images';

// Base upload directory in public folder
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

// Ensure directory exists
const ensureDir = async (dir: string) => {
  try {
    await fsPromises.mkdir(dir, { recursive: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
      throw error;
    }
  }
};

// Get file extension
const getFileExtension = (filename: string): string => {
  return path.extname(filename).toLowerCase();
};

// Generate timestamp
const getTimestampSuffix = (): string => {
  const now = new Date();
  return `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}`;
};

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
 * @param type The type of upload (profile-pictures, proof-of-identity, proof-of-address, branch-images)
 * @param userId The user ID or identifier
 * @returns The relative path to the saved file
 */
export async function saveUploadedFile(file: File, type: UploadType, userId: string): Promise<string> {
  const uploadDir = path.join(UPLOAD_DIR, type, userId);
  await ensureDir(uploadDir);

  const originalName = file.name || 'upload';
  const nameParts = originalName.split('.');
  const baseName = nameParts.slice(0, -1).join('.') || 'file';
  const ext = '.' + nameParts.pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const sanitizedBase = baseName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const timestamp = getTimestampSuffix();
  const filename = `${sanitizedBase}_${timestamp}${ext}`;

  const filePath = path.join(uploadDir, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  await fsPromises.writeFile(filePath, buffer);

  return path.join(type, userId, filename);
}

/**
 * Save a base64 encoded image to disk
 * @param base64Data The base64 encoded image data
 * @param type The type of upload
 * @param userId The user ID or identifier
 * @param originalName Optional original name to use in filename
 * @returns The relative path to the saved file
 */
export async function saveBase64Image(
  base64Data: string,
  type: UploadType,
  userId: string,
  originalName?: string
): Promise<string> {
  const uploadDir = path.join(UPLOAD_DIR, type, userId);
  await ensureDir(uploadDir);

  let data = base64Data;
  let extension = '.jpg';

  if (base64Data.includes('data:')) {
    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      throw new Error('Invalid base64 data format');
    }

    const mimeType = matches[1];
    data = matches[2];

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

  const fallbackName = originalName || 'upload';
  const nameParts = fallbackName.split('.');
  const baseName = nameParts.slice(0, -1).join('.') || 'file';
  const sanitizedBase = baseName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const timestamp = getTimestampSuffix();
  const finalFileName = `${sanitizedBase}_${timestamp}${extension}`;

  const filePath = path.join(uploadDir, finalFileName);
  const buffer = Buffer.from(data, 'base64');
  await fsPromises.writeFile(filePath, buffer);

  return path.join(type, userId, finalFileName);
}
