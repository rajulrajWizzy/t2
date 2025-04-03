const cloudinary = require('cloudinary').v2;

// Configure cloudinary
cloudinary.config({
  cloud_name: 'coworks',
  api_key: '862852185369771',
  api_secret: 'WW9sh6xwdKoSeSSTT78pNt4h8mk',
  secure: true
});

// Folder paths for different image types
export const CLOUDINARY_FOLDERS = {
  PROFILES: 'coworks/profiles',
  DOCUMENTS: {
    IDENTITY: 'coworks/documents/identity',
    ADDRESS: 'coworks/documents/address'
  },
  BRANCHES: {
    HOT_DESK: 'coworks/branches/hotdesk',
    DEDICATED_DESK: 'coworks/branches/dedicated',
    MEETING_ROOM: 'coworks/branches/meeting',
    CUBICLE: 'coworks/branches/cubicle',
    CUBICLE_3: 'coworks/branches/cubicle/3-seater',
    CUBICLE_4: 'coworks/branches/cubicle/4-seater',
    CUBICLE_6: 'coworks/branches/cubicle/6-seater',
    CUBICLE_10: 'coworks/branches/cubicle/10-seater',
    DAILY_PASS: 'coworks/branches/daily',
    DEFAULT: 'coworks/branches/default'
  }
};

interface UploadResult {
  secure_url: string;
  public_id: string;
  [key: string]: any;
}

/**
 * Upload an image to Cloudinary
 * @param imageBuffer The image buffer to upload
 * @param folder Cloudinary folder to store the image
 * @param publicId Optional public ID for the image
 * @returns The Cloudinary image URL and public ID
 */
export async function uploadImage(
  imageBuffer: Buffer,
  folder: string,
  publicId?: string
): Promise<{ url: string; publicId: string }> {
  try {
    const uploadOptions: any = {
      folder,
      resource_type: 'image',
      overwrite: true,
      format: 'jpg'
    };

    if (publicId) {
      uploadOptions.public_id = publicId;
    }

    // Convert buffer to base64 for Cloudinary upload
    const base64Image = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;
    
    const result = await cloudinary.uploader.upload(base64Image, uploadOptions) as UploadResult;

    return {
      url: result.secure_url,
      publicId: result.public_id
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error(`Failed to upload image: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Upload a profile picture
 * @param file The file to upload
 * @returns The Cloudinary profile image result
 */
export async function uploadProfilePicture(file: Blob): Promise<UploadResult> {
  // Create a FormData instance
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', 'coworks_profiles');
  formData.append('folder', CLOUDINARY_FOLDERS.PROFILES);
  
  // Upload to Cloudinary
  const response = await fetch(`https://api.cloudinary.com/v1_1/coworks/image/upload`, {
    method: 'POST',
    body: formData
  });
  
  if (!response.ok) {
    throw new Error(`Upload failed with status: ${response.status}`);
  }
  
  return await response.json();
}

/**
 * Upload a proof document
 * @param file The file to upload
 * @param documentType The type of document (proof_of_identity or proof_of_address)
 * @returns The Cloudinary document result
 */
export async function uploadProofDocument(file: Blob, documentType: string): Promise<UploadResult> {
  // Create a FormData instance
  const formData = new FormData();
  formData.append('file', file);
  
  // Determine folder and upload preset based on document type
  let folder = '';
  let uploadPreset = '';
  
  if (documentType === 'proof_of_identity') {
    folder = CLOUDINARY_FOLDERS.DOCUMENTS.IDENTITY;
    uploadPreset = 'coworks_identity';
  } else if (documentType === 'proof_of_address') {
    folder = CLOUDINARY_FOLDERS.DOCUMENTS.ADDRESS;
    uploadPreset = 'coworks_address';
  } else {
    throw new Error(`Invalid document type: ${documentType}`);
  }
  
  formData.append('upload_preset', uploadPreset);
  formData.append('folder', folder);
  
  // Determine resource type based on file type
  const resourceType = file.type === 'application/pdf' ? 'raw' : 'image';
  
  // Upload to Cloudinary
  const response = await fetch(`https://api.cloudinary.com/v1_1/coworks/${resourceType}/upload`, {
    method: 'POST',
    body: formData
  });
  
  if (!response.ok) {
    throw new Error(`Upload failed with status: ${response.status}`);
  }
  
  return await response.json();
}

/**
 * Upload a branch image
 * @param imageBuffer The image buffer to upload
 * @param branchId The branch ID
 * @param seatingType The type of seating
 * @param index Optional index if multiple images per seating type
 * @returns The Cloudinary branch image URL
 */
export async function uploadBranchImage(
  imageBuffer: Buffer,
  branchId: number | string,
  seatingType: string,
  index: number = 1
): Promise<string> {
  // Choose the appropriate folder based on seating type
  let folder = CLOUDINARY_FOLDERS.BRANCHES.DEFAULT;
  
  if (seatingType === 'HOT_DESK') {
    folder = CLOUDINARY_FOLDERS.BRANCHES.HOT_DESK;
  } else if (seatingType === 'DEDICATED_DESK') {
    folder = CLOUDINARY_FOLDERS.BRANCHES.DEDICATED_DESK;
  } else if (seatingType === 'MEETING_ROOM') {
    folder = CLOUDINARY_FOLDERS.BRANCHES.MEETING_ROOM;
  } else if (seatingType === 'CUBICLE_3') {
    folder = CLOUDINARY_FOLDERS.BRANCHES.CUBICLE_3;
  } else if (seatingType === 'CUBICLE_4') {
    folder = CLOUDINARY_FOLDERS.BRANCHES.CUBICLE_4;
  } else if (seatingType === 'CUBICLE_6') {
    folder = CLOUDINARY_FOLDERS.BRANCHES.CUBICLE_6;
  } else if (seatingType === 'CUBICLE_10') {
    folder = CLOUDINARY_FOLDERS.BRANCHES.CUBICLE_10;
  } else if (seatingType === 'DAILY_PASS') {
    folder = CLOUDINARY_FOLDERS.BRANCHES.DAILY_PASS;
  } else if (seatingType.startsWith('CUBICLE')) {
    folder = CLOUDINARY_FOLDERS.BRANCHES.CUBICLE;
  }

  const { url } = await uploadImage(
    imageBuffer,
    folder,
    `branch_${branchId}_${seatingType.toLowerCase()}_${index}`
  );
  
  return url;
}

/**
 * Delete an image from Cloudinary
 * @param publicId The public ID of the image to delete
 * @returns Whether the deletion was successful
 */
export async function deleteImage(publicId: string): Promise<boolean> {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result.result === 'ok';
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    return false;
  }
}

export default cloudinary; 