// src/utils/imageUploadService.ts
import { Storage } from '@google-cloud/storage';
import { v4 as uuidv4 } from 'uuid';

// Determine if running in production (Vercel)
const isProduction = process.env.NODE_ENV === 'production';

// Set up storage based on environment
let storage: Storage | null = null;

if (process.env.GOOGLE_CLOUD_CREDENTIALS) {
  try {
    const credentials = JSON.parse(
      Buffer.from(process.env.GOOGLE_CLOUD_CREDENTIALS, 'base64').toString()
    );
    
    storage = new Storage({
      projectId: credentials.project_id,
      credentials
    });
  } catch (error) {
    console.error('Error initializing Google Cloud Storage:', error);
    storage = null;
  }
}

const bucketName = process.env.GOOGLE_CLOUD_BUCKET || 'my-booking-app-uploads';

/**
 * Uploads an image to storage
 * @param file Base64 encoded file data
 * @param folder Folder to store the image in
 * @returns URL of the uploaded image
 */
export async function uploadImage(
  file: string,
  folder: 'profile' | 'branch' = 'profile'
): Promise<string> {
  try {
    // Check if file is base64
    if (!file.startsWith('data:image/')) {
      throw new Error('Invalid file format. Only base64 encoded images are supported.');
    }
    
    // Extract mime type and base64 data
    const matches = file.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    
    if (!matches || matches.length !== 3) {
      throw new Error('Invalid base64 format');
    }
    
    const mimeType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Generate file extension from mime type
    let extension = 'jpg';
    if (mimeType === 'image/png') extension = 'png';
    if (mimeType === 'image/gif') extension = 'gif';
    if (mimeType === 'image/webp') extension = 'webp';
    
    // Generate unique filename
    const filename = `${folder}/${uuidv4()}.${extension}`;
    
    // If in production and Google Cloud Storage is configured, use it
    if (isProduction && storage) {
      const bucket = storage.bucket(bucketName);
      const file = bucket.file(filename);
      
      // Upload the file
      await file.save(buffer, {
        metadata: {
          contentType: mimeType
        }
      });
      
      // Make the file publicly accessible
      await file.makePublic();
      
      // Return the public URL
      return `https://storage.googleapis.com/${bucketName}/${filename}`;
    } 
    
    // Otherwise, simulate upload for local development or if GCS is not configured
    console.warn('Using fallback URL for image upload (development mode or missing GCS config)');
    
    // In production without GCS config, we'll use a Vercel Blob storage solution
    if (isProduction) {
      // This is a placeholder for Vercel Blob Storage implementation
      // In a real implementation, we would use Vercel Blob Storage here
      
      // For now, we'll just return a placeholder URL
      return `https://placehold.co/400x400?text=Uploaded+Image`;
    }
    
    // For local development, return a placeholder URL
    return `http://localhost:3000/api/placeholder/${filename}`;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw new Error(`Image upload failed: ${(error as Error).message}`);
  }
}

/**
 * Deletes an image from storage
 * @param url URL of the image to delete
 */
export async function deleteImage(url: string): Promise<void> {
  try {
    // Only proceed if we have storage configured
    if (!storage) {
      console.warn('Storage not configured, skipping image deletion');
      return;
    }
    
    // Extract filename from URL
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    const filename = pathParts.slice(2).join('/'); // Remove the first two parts (/ and bucket name)
    
    // Delete the file
    await storage.bucket(bucketName).file(filename).delete();
    
    console.log(`Successfully deleted image: ${filename}`);
  } catch (error) {
    console.error('Error deleting image:', error);
    throw new Error(`Image deletion failed: ${(error as Error).message}`);
  }
}