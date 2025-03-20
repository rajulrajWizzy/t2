import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary with credentials from environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'default',
  api_key: process.env.CLOUDINARY_API_KEY || '862852185369771',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'WW9sh6xwdKoSeSSTT78pNt4h8mk'
});

// Define folder paths for different image types
export const CLOUDINARY_FOLDERS = {
  PROFILE_PICTURES: 'coworks/profile_pictures',
  BRANCHES: {
    HOT_DESK: 'coworks/branches/hot_desk',
    DEDICATED_DESK: 'coworks/branches/dedicated_desk',
    CUBICLE: 'coworks/branches/cubicle',
    CUBICLE_3: 'coworks/branches/cubicle_3',
    CUBICLE_4: 'coworks/branches/cubicle_4',
    CUBICLE_6: 'coworks/branches/cubicle_6',
    CUBICLE_10: 'coworks/branches/cubicle_10',
    MEETING_ROOM: 'coworks/branches/meeting_room',
    DAILY_PASS: 'coworks/branches/daily_pass'
  }
};

/**
 * Upload an image to Cloudinary
 * @param file The image file (base64 or URL)
 * @param folder The folder path
 * @param publicId Optional public ID for the image
 * @returns The upload result
 */
export const uploadImage = async (
  file: string, 
  folder: string, 
  publicId?: string
): Promise<any> => {
  const uploadOptions: any = {
    folder,
    resource_type: 'image',
    overwrite: true
  };
  
  if (publicId) {
    uploadOptions.public_id = publicId;
  }
  
  return cloudinary.uploader.upload(file, uploadOptions);
};

/**
 * Delete an image from Cloudinary
 * @param publicId The public ID of the image to delete
 * @returns The deletion result
 */
export const deleteImage = async (publicId: string): Promise<any> => {
  return cloudinary.uploader.destroy(publicId);
};

/**
 * Generate a Cloudinary URL for an image with transformations
 * @param publicId The public ID of the image
 * @param options Transformation options
 * @returns The transformed image URL
 */
export const getImageUrl = (
  publicId: string, 
  options: { width?: number; height?: number; crop?: string; quality?: number } = {}
): string => {
  const { width, height, crop = 'fill', quality = 90 } = options;
  
  return cloudinary.url(publicId, {
    secure: true,
    width,
    height,
    crop,
    quality
  });
};

export default cloudinary; 