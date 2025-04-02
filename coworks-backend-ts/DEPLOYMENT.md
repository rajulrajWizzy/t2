# Deployment Guide

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

## Performance Optimization

1. Enable caching where appropriate
2. Optimize database queries
3. Consider using Edge Functions for latency-sensitive operations

## Post-Deployment Checks

1. Verify all API endpoints are working
2. Check database connections
3. Test authentication flows

For additional support, refer to the [Vercel Documentation](https://vercel.com/docs) or create an issue in the GitHub repository. 