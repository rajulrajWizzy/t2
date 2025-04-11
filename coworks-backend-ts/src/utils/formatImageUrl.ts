import { NextRequest } from 'next/server';

/**
 * Formats an image URL to be fully accessible from the frontend
 * 
 * @param {string|null} imageUrl - The image URL or path from the database
 * @param {NextRequest} request - The NextRequest object to extract host information
 * @returns {string|null} - A fully qualified URL that can be accessed by the frontend
 */
export function formatImageUrl(imageUrl: string | null, request: NextRequest): string | null {
  if (!imageUrl) return null;
  
  // If it's already a fully qualified URL (starts with http/https), return as is
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }
  
  // Build the base URL from environment variable or request headers
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                 `${request.headers.get('x-forwarded-proto') || 'http'}://${request.headers.get('host')}`;
  
  // Clean up the path to prevent double slashes
  let path = imageUrl;
  
  // Remove leading slash if present
  if (path.startsWith('/')) {
    path = path.substring(1);
  }
  
  // Check if path already contains 'uploads/' prefix
  if (path.includes('uploads/')) {
    // Path already has the uploads prefix, just ensure proper structure
    return `${baseUrl}/${path}`;
  }
  
  // If not, add the uploads prefix
  return `${baseUrl}/uploads/${path}`;
}

/**
 * Format all image URLs in an object
 * 
 * @param {any} obj - The object containing image URLs
 * @param {string[]} imageFields - Array of field names containing image URLs
 * @param {NextRequest} request - The NextRequest object
 * @returns {any} - The object with formatted image URLs
 */
export function formatObjectImages(obj: any, imageFields: string[], request: NextRequest): any {
  if (!obj) return obj;
  
  const result = { ...obj };
  
  for (const field of imageFields) {
    if (result[field]) {
      result[field] = formatImageUrl(result[field], request);
    }
  }
  
  return result;
}

/**
 * Format all image URLs in an array of objects
 * 
 * @param {any[]} arr - Array of objects containing image URLs
 * @param {string[]} imageFields - Array of field names containing image URLs
 * @param {NextRequest} request - The NextRequest object
 * @returns {any[]} - The array with formatted image URLs
 */
export function formatArrayImages(arr: any[], imageFields: string[], request: NextRequest): any[] {
  if (!arr || !Array.isArray(arr)) return arr;
  
  return arr.map(item => formatObjectImages(item, imageFields, request));
} 