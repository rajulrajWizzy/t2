import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

// Define allowed file types
const ALLOWED_FILE_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'application/pdf': 'pdf'
};

// Maximum file size (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Create upload directories if they don't exist
const createUploadDirs = () => {
  const dirs = ['profile_picture', 'proof_of_identity', 'proof_of_address'];
  const baseDir = path.join(process.cwd(), 'uploads');
  
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir);
  }
  
  dirs.forEach(dir => {
    const fullPath = path.join(baseDir, dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath);
    }
  });
};

// Create directories on startup
createUploadDirs();

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadDir = 'profile_picture';
    
    // Determine upload directory based on field name
    if (file.fieldname === 'proofOfIdentity') {
      uploadDir = 'proof_of_identity';
    } else if (file.fieldname === 'proofOfAddress') {
      uploadDir = 'proof_of_address';
    }
    
    cb(null, path.join(process.cwd(), 'uploads', uploadDir));
  },
  filename: (req, file, cb) => {
    const fileExt = ALLOWED_FILE_TYPES[file.mimetype];
    const fileName = `${uuidv4()}.${fileExt}`;
    cb(null, fileName);
  }
});

// File filter function
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Check if file type is allowed
  if (!ALLOWED_FILE_TYPES[file.mimetype]) {
    cb(new Error('File type not allowed'));
    return;
  }
  
  cb(null, true);
};

// Create multer instance with configuration
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE
  }
});

// Export configured multer middleware
export const uploadMiddleware = {
  single: (fieldName: string) => upload.single(fieldName),
  fields: (fields: { name: string; maxCount: number }[]) => upload.fields(fields)
};

// Export helper function to delete files
export const deleteFile = (filePath: string) => {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};