// src/config/storage.ts

/**
 * Storage configuration for the application
 */
const storageConfig = {
    // Determine if we're in production
    isProduction: process.env.NODE_ENV === 'production',
    
    // Check if Vercel Blob Storage is configured
    isVercelBlobConfigured: !!process.env.BLOB_READ_WRITE_TOKEN,
    
    // Base URL for assets
    baseUrl: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
    
    // Storage folders
    folders: {
      profile: 'profile',
      branch: 'branch'
    },
    
    // Max file size in bytes (5MB)
    maxFileSize: 5 * 1024 * 1024,
    
    // Allowed MIME types
    allowedMimeTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp'
    ]
  };
  
  export default storageConfig;