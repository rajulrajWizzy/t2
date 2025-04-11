const fs = require('fs');
const path = require('path');

// Define the base uploads directory in public folder
const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');

// Define subdirectories
const SUBDIRS = [
  'profile-pictures',
  'proof-of-identity',
  'proof-of-address',
  'branch-images'
];

// Create base uploads directory if it doesn't exist
if (!fs.existsSync(UPLOADS_DIR)) {
  console.log(`Creating base uploads directory: ${UPLOADS_DIR}`);
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Create each subdirectory
for (const subdir of SUBDIRS) {
  const fullPath = path.join(UPLOADS_DIR, subdir);
  if (!fs.existsSync(fullPath)) {
    console.log(`Creating subdirectory: ${fullPath}`);
    fs.mkdirSync(fullPath, { recursive: true });
  }
}

console.log('Uploads directory structure created successfully in public folder.'); 