const fs = require('fs');
const path = require('path');

// Define the base uploads directory
const uploadsDir = path.join(process.cwd(), 'uploads');

// Define subdirectories for different types of uploads
const directories = [
  'profile-pictures',
  'branch-images',
  'proof-of-identity',
  'proof-of-address',
  'tmp'
];

// Create the directories
console.log('Creating upload directories...');

// Create the base uploads directory if it doesn't exist
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
  console.log(`Created main uploads directory: ${uploadsDir}`);
}

// Create each subdirectory
directories.forEach(dir => {
  const dirPath = path.join(uploadsDir, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath);
    console.log(`Created directory: ${dirPath}`);
  } else {
    console.log(`Directory already exists: ${dirPath}`);
  }
});

// Create a .gitkeep file in each directory to ensure they're tracked by git
directories.forEach(dir => {
  const gitkeepPath = path.join(uploadsDir, dir, '.gitkeep');
  if (!fs.existsSync(gitkeepPath)) {
    fs.writeFileSync(gitkeepPath, '');
    console.log(`Created .gitkeep in: ${dir}`);
  }
});

// Create a README.md file in the uploads directory
const readmePath = path.join(uploadsDir, 'README.md');
const readmeContent = `# Uploads Directory

This directory is used to store uploaded files. The structure is as follows:

- \`profile-pictures/\`: User profile pictures
- \`branch-images/\`: Images of branches
- \`proof-of-identity/\`: User ID proof documents
- \`proof-of-address/\`: User address proof documents
- \`tmp/\`: Temporary files

Note: In a production environment, you may want to use cloud storage instead of local file storage.
`;

fs.writeFileSync(readmePath, readmeContent);
console.log(`Created README.md in uploads directory`);

// Create .gitignore file to ignore uploaded files but track directory structure
const gitignorePath = path.join(uploadsDir, '.gitignore');
const gitignoreContent = `# Ignore all files in this directory
*

# Except for .gitkeep files in subdirectories
!*/
!*/.gitkeep

# Don't ignore these files
!.gitignore
!README.md
`;

fs.writeFileSync(gitignorePath, gitignoreContent);
console.log(`Created .gitignore in uploads directory`);

console.log('Uploads directory structure created successfully!'); 