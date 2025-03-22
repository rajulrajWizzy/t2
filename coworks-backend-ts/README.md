# Coworks Backend

A TypeScript-based backend service for managing coworking spaces.

## Features

- Admin authentication and management system
- Super admin and branch admin role-based access control
- API endpoints for user management, bookings, and spaces
- Secure password handling with bcrypt
- Database integration with Sequelize

## Setup

### Prerequisites

- Node.js (v18.x recommended)
- npm or yarn
- PostgreSQL or MySQL database

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/coworks-backend-ts.git
   cd coworks-backend-ts
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the root directory with the following content:
   ```
   # Database Configuration
   DB_HOST=localhost
   DB_USER=your_db_username
   DB_PASS=your_db_password
   DB_NAME=coworks_db
   DB_PORT=5432
   
   # JWT Secret
   JWT_SECRET=your_jwt_secret_key
   
   # Server Configuration
   PORT=3000
   NODE_ENV=development
   ```

4. Set up the database:
   ```
   npm run db:setup
   ```

5. Seed the initial super admin:
   ```
   node scripts/seed-superadmin.js
   ```

6. Start the development server:
   ```
   npm run dev
   ```

## Admin Management

The system includes a command-line tool for managing admin accounts:

```
node scripts/admin-manager.js [command] [options]
```

Available commands:
- `create`: Create a new admin user
- `list`: List all admin users
- `update`: Update an existing admin user
- `delete`: Delete an admin user
- `reset-pwd`: Reset an admin's password
- `help`: Show help information

Example:
```
node scripts/admin-manager.js create --username=admin2 --password=SecurePass123 --email=admin2@example.com --name="Admin Two" --role=branch_admin --branch=1
```

## API Testing

You can test the API endpoints using the provided script:

```
bash admin-api-test.sh
```

Make sure to update the `API_BASE` variable in the script with your actual API domain.

## Default Super Admin

The system seeds an initial super admin with the following credentials:
- Username: `superadmin`
- Password: `CoWorks@SuperAdmin2023`

**Important:** Change this password after the first login.

## API Documentation

A comprehensive API collection is available in the following formats:
- Markdown: `coworks-api-collection.md`
- Curl commands: `coworks-api-collection.curl`
- Postman collection: `coworks-api-collection.json`

## Deployment

This project is set up for deployment on Vercel. For detailed deployment instructions, see [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md).

### Quick Deployment Steps

1. **Prepare Your Environment**:
   - Make sure you're using Node.js 18.x (check with `node --version`)
   - Install the Vercel CLI: `npm i -g vercel`

2. **Fix Common Issues**:
   - Run the fix scripts:
     ```
     node fix-package.js
     node fix-babel.js
     node fix-fonts.js
     node fix-runtime.js
     ```
   - These scripts ensure your configuration is ready for Vercel:
     - `fix-package.js`: Updates package.json for compatibility
     - `fix-babel.js`: Configures Babel for proper TypeScript transpilation
     - `fix-fonts.js`: Resolves font import conflicts with SWC
     - `fix-runtime.js`: Ensures API routes use Node.js runtime for Sequelize compatibility

3. **Deploy**:
   - On Windows: `.\deploy.ps1`
   - On Linux/Mac: `./deploy.sh`

### Troubleshooting

If you're encountering issues when deploying to Vercel, try the following:

### Edge Runtime Issues

If you encounter errors like `Dynamic Code Evaluation (e. g. 'eval', 'new Function') not allowed in Edge Runtime`, run:

```bash
node fix-runtime.js
```

This script:
- Adds `export const runtime = "nodejs"` to all API routes 
- Fixes JWT utils to safely run in Edge and Node.js environments
- Updates middleware to avoid direct Sequelize imports
- Creates a safe version of models for edge functions
- Configures `next.config.js` properly for Sequelize compatibility

### JWT Import Issues

If you see errors related to missing JWT utility functions like `verifyJWT` or `verifyAuth`, run:

```bash
node fix-jwt-exports.js
```

This script:
- Fixes import paths for JWT utility functions in API route files
- Ensures all routes use proper imports from the JWT utilities

### Other Common Deployment Issues

Run the following helper scripts to fix other common issues:

```bash
node debug-build.js    # Diagnose common deployment issues
node fix-babel.js      # Fix Babel dependencies
node fix-fonts.js      # Fix font imports
node check-edge-imports.js  # Check for problematic imports in Edge Runtime files
```

## License

[MIT](LICENSE)