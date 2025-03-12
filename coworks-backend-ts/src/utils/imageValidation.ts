// src/utils/imageValidation.ts
import storageConfig from '@/config/storage';

/**
 * Interface for validated image data
 */
export interface ValidatedImage {
  mimeType: string;
  extension: string;
  buffer: Buffer;
  isValid: boolean;
  error?: string;
}

/**
 * Validates and extracts data from a base64 image string
 * @param base64Image Base64 encoded image string
 * @returns Validated image data
 */
export function validateBase64Image(base64Image: string): ValidatedImage {
  // Default error response
  const errorResult: ValidatedImage = {
    mimeType: '',
    extension: '',
    buffer: Buffer.from(''),
    isValid: false,
    error: 'Invalid image format'
  };
  
  // Check if input is valid
  if (!base64Image || typeof base64Image !== 'string') {
    return { ...errorResult, error: 'Image data is required' };
  }
  
  // Check if file is base64
  if (!base64Image.startsWith('data:image/')) {
    return { ...errorResult, error: 'Invalid file format. Only base64 encoded images are supported.' };
  }
  
  // Extract mime type and base64 data
  const matches = base64Image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  
  if (!matches || matches.length !== 3) {
    return { ...errorResult, error: 'Invalid base64 format' };
  }
  
  const mimeType = matches[1];
  const base64Data = matches[2];
  
  // Check if mime type is allowed
  if (!storageConfig.allowedMimeTypes.includes(mimeType)) {
    return { 
      ...errorResult, 
      error: `Unsupported image format. Allowed formats: ${storageConfig.allowedMimeTypes.join(', ')}` 
    };
  }
  
  // Convert to buffer and check size
  try {
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Check file size
    if (buffer.length > storageConfig.maxFileSize) {
      return { 
        ...errorResult, 
        error: `Image too large. Maximum size is ${storageConfig.maxFileSize / (1024 * 1024)}MB` 
      };
    }
    
    // Generate file extension from mime type
    let extension = 'jpg';
    if (mimeType === 'image/png') extension = 'png';
    if (mimeType === 'image/gif') extension = 'gif';
    if (mimeType === 'image/webp') extension = 'webp';
    
    return {
      mimeType,
      extension,
      buffer,
      isValid: true
    };
  } catch (error) {
    return { ...errorResult, error: 'Failed to process image data' };
  }
}