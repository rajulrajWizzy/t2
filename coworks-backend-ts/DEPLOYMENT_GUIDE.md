# Deployment Guide for CoWorks

This guide provides detailed instructions for deploying the CoWorks backend application to Vercel.

## Prerequisites

- Node.js 18.x installed
- npm installed
- Vercel CLI installed (`npm i -g vercel`)
- Vercel account connected to your GitHub repository

## Configuration Files

The following configuration files are essential for deployment:

1. **next.config.js** - Contains Next.js-specific configurations
2. **vercel.json** - Contains Vercel-specific deployment configurations
3. **.nvmrc** - Specifies the Node.js version
4. **package.json** - Contains project dependencies and scripts
5. **.babelrc** or **babel.config.js** - Contains Babel configuration for transpilation

## Deployment Steps

### Option 1: Using the deploy.sh Script

1. Make the script executable:
   ```bash
   chmod +x deploy.sh
   ```

2. Run the script:
   ```bash
   ./deploy.sh
   ```

### Option 2: Manual Deployment

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the application:
   ```bash
   npm run build
   ```

3. Deploy to Vercel:
   ```bash
   npx vercel --prod
   ```

## Environment Variables

Ensure the following environment variables are set in your Vercel project settings:

- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret key for JWT tokens
- `JWT_EXPIRES_IN`: JWT token expiration time (e.g., "1d")
- `NODE_ENV`: Set to "production" for production deployments

## Troubleshooting

### Babel Configuration Issues

If you encounter errors related to class private methods, TypeScript "declare" fields, or SWC conflicts, run:

```bash
node fix-babel.js
```

This script:
1. Installs necessary Babel plugins for private methods and TypeScript
2. Updates .babelrc with the correct configuration
3. Creates a backup babel.config.js file for added reliability

Common Babel errors to watch for:
- "Class private methods are not enabled"
- "TypeScript 'declare' fields must first be transformed"
- "next/font requires SWC although Babel is being used"

### Build Failures

1. **TypeScript Errors**
   - Our configuration ignores TypeScript errors during build (see `next.config.js`)
   - To debug locally: `npm run lint`

2. **Dependency Issues**
   - Check for conflicting versions: `npm ls`
   - Try clearing cache: `npm cache clean --force`

3. **Memory Issues**
   - Increase memory limit: Set `NODE_OPTIONS=--max-old-space-size=4096` in environment variables

### Runtime Errors

1. **Database Connection Issues**
   - Verify `DATABASE_URL` is correct and accessible from Vercel
   - Check if IP restrictions are in place on your database

2. **API Route Failures**
   - Check CORS headers in `vercel.json` and `next.config.js`
   - Test API routes locally with `npm run dev`

3. **JWT Authentication Issues**
   - Ensure `JWT_SECRET` is properly set
   - Check token expiration settings

## Debugging Tools

- Use Vercel build logs to identify issues
- Enable debug mode: `npx vercel --debug`
- Check application logs in Vercel dashboard
- Run `node debug-build.js` to automatically check for common issues

## Performance Optimization

1. Enable caching where appropriate
2. Optimize database queries
3. Consider using Edge Functions for latency-sensitive operations

## Post-Deployment Checks

1. Verify all API endpoints are working
2. Check database connections
3. Test authentication flows

## Common Deployment Errors and Solutions

### Error: Class private methods are not enabled

**Solution**: 
- Add `@babel/plugin-transform-private-methods` to your Babel configuration
- Run `node fix-babel.js` to automatically fix this issue

### Error: TypeScript 'declare' fields must first be transformed

**Solution**:
- Ensure `@babel/plugin-transform-typescript` is added to your Babel configuration before class-related plugins
- Run `node fix-babel.js` to automatically fix this issue

### Error: next/font requires SWC although Babel is being used

**Solution**:
- Update .babelrc to properly support SWC and font loading
- Consider removing .babelrc entirely if you don't need custom Babel configuration
- Run `node fix-babel.js` to create an appropriate configuration

For additional support, refer to the [Vercel Documentation](https://vercel.com/docs) or create an issue in the GitHub repository. 