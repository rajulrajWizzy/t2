// src/utils/vercelBlobService.ts
import { v4 as uuidv4 } from 'uuid';
import { put, del } from '@vercel/blob';
import { validateBase64Image } from './imageValidation';
import storageConfig from '@/config/storage';

/**
 * Uploads an image to Vercel Blob Storage
 * @param file Base64 encoded file data
 * @param folder Folder to store the image in ('profile' or 'branch')
 * @returns URL of the uploaded image
 */
export async function uploadImageToBlob(
  file: string,
  folder: 'profile' | 'branch' = 'profile'
): Promise<string> {
  try {
    // Validate the image
    const validatedImage = validateBase64Image(file);
    
    if (!validatedImage.isValid) {
      throw new Error(validatedImage.error);
    }
    
    // Generate unique filename
    const filename = `${folder}/${uuidv4()}.${validatedImage.extension}`;

    // Convert buffer to Blob for Vercel Blob Storage
    const blob = new Blob([validatedImage.buffer], { type: validatedImage.mimeType });
    
    // Upload to Vercel Blob Storage
    const result = await put(filename, blob, {
      contentType: validatedImage.mimeType,
      access: 'public',
    });
    
    // Return the URL
    return result.url;
  } catch (error) {
    console.error('Error uploading image to Vercel Blob:', error);
    throw new Error(`Image upload failed: ${(error as Error).message}`);
  }
}

/**
 * Deletes an image from Vercel Blob Storage
 * @param url URL of the image to delete
 */
export async function deleteImageFromBlob(url: string): Promise<void> {
  try {
    // Skip if URL is from placeholder API
    if (url.includes('/api/placeholder/')) {
      return;
    }
    
    // Use Vercel Blob Storage API to delete the file
    await del(url);
    
    console.log(`Successfully deleted image from Vercel Blob: ${url}`);
  } catch (error) {
    console.error('Error deleting image from Vercel Blob:', error);
    throw new Error(`Image deletion failed: ${(error as Error).message}`);
  }
}