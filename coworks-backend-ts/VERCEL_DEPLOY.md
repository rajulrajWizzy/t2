# Vercel Deployment Instructions

## Issue Fix for Vercel Deployment

The current deployment is failing due to several issues:

1. Compatibility issues between date-fns v4 and @mui/x-date-pickers
2. Edge Runtime issues with Sequelize (dynamic code evaluation)
3. Client component directive conflicts with metadata export

## How to Fix for Deployment

### 1. Manual Fixes Applied

The following fixes have been applied:

- Created `vercel-deploy-fix.js` script to automatically fix issues before build
- Downgraded date-fns to v2.30.0
- Added explicit Node.js runtime directive to middleware
- Removed 'use client' directive from layout.tsx
- Updated next.config.mjs to disable Edge Runtime
- Created middleware.config.js to use Node.js runtime

### 2. Vercel Project Settings

Make the following changes in your Vercel project settings:

1. **Environment Variables**:
   - Add `NODE_OPTIONS` with value `--max-old-space-size=4096` to increase memory limit

2. **Build & Development Settings**:
   - Build Command: `npm run vercel-build`
   - Output Directory: `.next`
   - Install Command: `npm install`
   - Node.js Version: 18.x

3. **Serverless Function Settings**:
   - Maximum Duration: 30 seconds (or higher if needed)

### 3. Bypassing Edge Runtime for All Routes

You may need to modify specific routes that are attempting to use Edge Runtime. In each API route file:

```typescript
// Add this at the top of API route files
export const runtime = 'nodejs';
```

## Troubleshooting

If you continue to see errors related to:

### date-fns
Ensure the version is set to 2.30.0 in package.json:
```json
"date-fns": "2.30.0"
```

### Dynamic Code Evaluation
Add the appropriate runtime directive to all files that use Sequelize:
```typescript
export const runtime = 'nodejs';
```

### Client/Server Component Conflicts
Make sure that files exporting `metadata` do not have the 'use client' directive.

### Common Deployment Error Patterns

- **Module not found**: Check package versions for compatibility
- **Edge Runtime errors**: Add `runtime = 'nodejs'` directive to files
- **Memory issues**: Increase `NODE_OPTIONS` with more memory 