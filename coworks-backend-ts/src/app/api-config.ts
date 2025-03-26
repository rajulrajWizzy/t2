import { ApiEndpoint } from '@/types/api';

const apiEndpoints: ApiEndpoint[] = [
  // ... existing code ...

  // File Upload Endpoints
  {
    path: '/api/upload',
    method: 'POST',
    auth: 'Any',
    handler: 'src/app/api/upload/route.ts',
    description: 'Upload files to the server'
  },
  
  // File Serving Endpoints
  {
    path: '/api/files/:path*',
    method: 'GET',
    auth: 'None',
    handler: 'src/app/api/files/[...path]/route.ts',
    description: 'Serve uploaded files'
  },
  
  // File Management Endpoints
  {
    path: '/api/uploads',
    method: 'GET',
    auth: 'Admin',
    handler: 'src/app/api/uploads/route.ts',
    description: 'List all uploaded files (admin only)'
  }
];

export default apiEndpoints; 