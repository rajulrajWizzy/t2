// Explicitly set Node.js runtime for this route
export const runtime = "nodejs";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from 'next/server';

/**
 * Test branch upload HTML form
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <title>Branch Image Upload Test</title>
    <style>
      body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
      h1 { color: #333; }
      form { margin-bottom: 30px; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
      label { display: block; margin-bottom: 10px; }
      input, select { margin-bottom: 15px; padding: 8px; width: 100%; }
      button { background: #4CAF50; color: white; border: none; padding: 10px 15px; cursor: pointer; }
      .instructions { background: #f8f8f8; padding: 15px; border-left: 4px solid #4CAF50; margin-bottom: 20px; }
      .code { font-family: monospace; background: #f1f1f1; padding: 2px 5px; }
    </style>
  </head>
  <body>
    <h1>Branch Image Upload Test</h1>
    
    <div class="instructions">
      <h3>How it works</h3>
      <p>This test form demonstrates uploading branch images using multipart form data. The API follows these steps:</p>
      <ol>
        <li>Authenticates the user (skipped in this test)</li>
        <li>Validates the image file (type, size)</li>
        <li>Saves the image to <span class="code">uploads/branch-images/[branch_id]/[seating_type]/[uuid].jpg</span></li>
        <li>Creates a DB record with the relative image path</li>
        <li>Returns the full URL including the host</li>
      </ol>
    </div>
    
    <form enctype="multipart/form-data" method="post" action="/api/branches/images/upload">
      <h2>Upload Branch Image</h2>
      
      <label for="branch_id">Branch ID:</label>
      <input type="number" id="branch_id" name="branch_id" required value="1">
      
      <label for="seating_type">Seating Type:</label>
      <select id="seating_type" name="seating_type" required>
        <option value="HOT_DESK">Hot Desk</option>
        <option value="DEDICATED_DESK">Dedicated Desk</option>
        <option value="MEETING_ROOM">Meeting Room</option>
        <option value="CUBICLE_3">Cubicle (3 Person)</option>
        <option value="CUBICLE_4">Cubicle (4 Person)</option>
        <option value="CUBICLE_6">Cubicle (6 Person)</option>
        <option value="CUBICLE_10">Cubicle (10 Person)</option>
        <option value="DAILY_PASS">Daily Pass</option>
        <option value="DEFAULT">Default</option>
      </select>
      
      <label for="is_primary">Is Primary Image:</label>
      <select id="is_primary" name="is_primary">
        <option value="true">Yes</option>
        <option value="false">No</option>
      </select>
      
      <label for="index">Image Index (if multiple images per type):</label>
      <input type="number" id="index" name="index" value="1">
      
      <label for="image">Select Image (JPG or PNG):</label>
      <input type="file" id="image" name="image" required accept="image/jpeg,image/jpg,image/png">
      
      <button type="submit">Upload Image</button>
    </form>
    
    <div class="instructions">
      <h3>API Usage in code</h3>
      <pre class="code">
// JavaScript example
const formData = new FormData();
formData.append('branch_id', '1');
formData.append('seating_type', 'MEETING_ROOM');
formData.append('is_primary', 'true');
formData.append('index', '1');
formData.append('image', imageFile); // File object from input

fetch('/api/branches/images/upload', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN_HERE'
  },
  body: formData
})
.then(response => response.json())
.then(data => console.log(data));
      </pre>
    </div>
  </body>
  </html>
  `;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html',
    },
  });
} 