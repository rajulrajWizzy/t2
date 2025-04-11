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
  const dirs = ['profile-pictures', 'proof-of-identity', 'proof-of-address', 'branch-images'];
  const baseDir = path.join(process.cwd(), 'public', 'uploads');
  
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
    let uploadDir = 'profile-pictures';
    
    // Determine upload directory based on field name
    if (file.fieldname === 'proofOfIdentity') {
      uploadDir = 'proof-of-identity';
    } else if (file.fieldname === 'proofOfAddress') {
      uploadDir = 'proof-of-address';
    } else if (file.fieldname === 'branchImage') {
      uploadDir = 'branch-images';
    }
    
    cb(null, path.join(process.cwd(), 'public', 'uploads', uploadDir));
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

// Create the multer upload instance
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

export default upload;