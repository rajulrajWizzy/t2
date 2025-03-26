import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary with environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true, // Use HTTPS for all requests
});

/**
 * Upload an image to Cloudinary
 * @param file URL or base64 encoded string of the image
 * @param folder Cloudinary folder to store the image in
 * @param publicId Optional specific public ID for the image
 * @returns Object with secure URL and other image metadata
 */
export async function uploadImage(
  file: string,
  folder: string = 'coworks', 
  publicId?: string
) {
  try {
    const uploadOptions: any = {
      folder,
      resource_type: 'auto',
      // Add transformations for better performance
      transformation: [
        { quality: 'auto:good' }, // Automatic quality optimization
        { fetch_format: 'auto' }, // Serve images in modern formats like WebP
      ]
    };

    // Optional public ID
    if (publicId) {
      uploadOptions.public_id = publicId;
    }

    const result = await cloudinary.uploader.upload(file, uploadOptions);
    
    return {
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
      resourceType: result.resource_type
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw error;
  }
}

/**
 * Delete an image from Cloudinary by its public ID
 * @param publicId The public ID of the image to delete
 * @returns Result of deletion operation
 */
export async function deleteImage(publicId: string) {
  try {
    return await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw error;
  }
}

/**
 * Generate a URL for an image with transformations
 * @param publicId The public ID of the image
 * @param options Transformation options
 * @returns Secure URL with transformations
 */
export function getImageUrl(publicId: string, options: any = {}) {
  return cloudinary.url(publicId, {
    secure: true,
    ...options
  });
}

export default cloudinary; 