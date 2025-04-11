const fs = require('fs');
const path = require('path');

// Define the base uploads directory
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

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

// Also create user-specific directories for each profile subdirectory
// If you have user IDs, you can create those directories here
// This is just an example for user ID 8
const USER_IDS = ['8'];

for (const userId of USER_IDS) {
  for (const subdir of ['profile_pictures', 'profile-pictures', 'proof_of_identity', 'proof-of-identity', 'proof_of_address', 'proof-of-address']) {
    const userDir = path.join(UPLOADS_DIR, subdir, userId);
    if (!fs.existsSync(userDir)) {
      console.log(`Creating user directory: ${userDir}`);
      fs.mkdirSync(userDir, { recursive: true });
    }
  }
}

console.log('Uploads directory structure created successfully.'); 