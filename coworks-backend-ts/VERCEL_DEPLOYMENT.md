# Vercel Deployment Guide

## Current Issues

The current Vercel deployment is failing due to three primary issues:

1. **Compatibility issues between date-fns v4 and @mui/x-date-pickers**
   - Error: `Module not found: Package path ./_lib/format/longFormatters is not exported from package`
   - Solution: Use date-fns v2.30.0 instead of v4

2. **Client/Server component conflict in layout.tsx**
   - Error: `You are attempting to export "metadata" from a component marked with "use client", which is disallowed`
   - Solution: Remove 'use client' directive while keeping metadata export 

3. **Edge Runtime restrictions on Sequelize**
   - Error: `Dynamic Code Evaluation (e. g. 'eval', 'new Function', 'WebAssembly.compile') not allowed in Edge Runtime`
   - Solution: Force Node.js runtime for all API routes and middleware

## Automated Fixes

We've implemented several automated fixes that run during the build process:

1. **vercel-deploy-fix.js** - Main script that:
   - Downgrades date-fns to v2.30.0 if needed
   - Creates middleware.config.js to use Node.js runtime
   - Updates next.config.mjs to disable Edge Runtime
   - Removes 'use client' directive from layout.tsx
   - Runs add-runtime-directive.js to add runtime directives to API routes

2. **add-runtime-directive.js** - Script that:
   - Finds all API route files (route.ts)
   - Adds `export const runtime = 'nodejs';` to each file
   - Skips files that already have the directive

## Manual Steps for Deployment

If the automated fixes don't resolve all issues, follow these manual steps:

### 1. Configure Vercel Project Settings

1. **Environment Variables**:
   - Add `NODE_OPTIONS` with value `--max-old-space-size=4096`

2. **Build & Development Settings**:
   - Build Command: `npm run vercel-build`
   - Output Directory: `.next`
   - Node.js Version: 18.x (important!)

### 2. Check Critical Files

1. **package.json**:
   - Ensure date-fns is exactly version 2.30.0:
     ```json
     "date-fns": "2.30.0",
     ```

2. **next.config.mjs**:
   - Make sure it has these settings:
     ```javascript
     experimental: {
       serverComponentsExternalPackages: ['sequelize', 'pg', 'pg-hstore', 'bcryptjs'],
       runtime: 'nodejs',
       disableEdgeRuntime: true,
     }
     ```

3. **src/app/layout.tsx**:
   - Remove `'use client';` if present
   - Keep the metadata export

4. **src/middleware.ts**:
   - Make sure it has:
     ```typescript
     export const runtime = 'nodejs';
     ```

### 3. Add Runtime Directive to Problematic Files

If the automated fix script doesn't catch all files, manually add this to the top of API route files:

```typescript
// Use Node.js runtime for Sequelize compatibility
export const runtime = 'nodejs';
```

## Troubleshooting

If deployment continues to fail:

1. **Check build logs** for specific errors
2. **Temporarily disable TypeScript checks** by adding `typescript: { ignoreBuildErrors: true }` to next.config.mjs
3. **Check for circular dependencies** in your models or utils
4. **Verify your npm dependencies** are compatible with Node.js 18.x (Vercel's default)

For persistent errors, consider forcing a clean build by clearing the Vercel cache from the project settings. 