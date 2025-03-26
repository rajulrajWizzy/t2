# Coworks Authentication API Guide

This document provides a comprehensive guide for authentication in the Coworks application, covering both user and admin authentication flows, required environment variables, and the proper order of API calls.

## Environment Variables

<<<<<<< Updated upstream
<<<<<<< Updated upstream
- Admin authentication and management system
- Super admin and branch admin role-based access control
- API endpoints for user management, bookings, and spaces
- Secure password handling with bcrypt
- Database integration with Sequelize

## Setup

### Prerequisites

- Node.js (v14 or higher)
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
=======
The following environment variables must be properly configured for authentication to work:
>>>>>>> Stashed changes
=======
The following environment variables must be properly configured for authentication to work:
>>>>>>> Stashed changes

```
# Database Configuration
DATABASE_URL=postgres://username:password@host:5432/database_name
DB_SCHEMA=excel_coworks_schema
DB_SSL=true

# JWT Configuration
JWT_SECRET=your_secure_random_secret_key
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Application Configuration
NODE_ENV=development
```

## Database Setup Fix

If you're experiencing database errors about missing columns, use the special setup endpoint to fix the database schema:

```
GET /api/setup/fix-customers-table
```

This endpoint doesn't require authentication and will add any missing columns to the customers table.

## Authentication Flow

### User Authentication

1. **Register a new user**
   ```
   POST /api/auth/register
   ```
   Body:
   ```json
   {
     "name": "User Name",
     "email": "user@example.com",
     "password": "SecurePassword123",
     "phone_number": "+1234567890",
     "address": "123 Main St"
   }
   ```

<<<<<<< Updated upstream
<<<<<<< Updated upstream
## API Documentation

A comprehensive API collection is available in the following formats:
- Markdown: `coworks-api-collection.md`
- Curl commands: `coworks-api-collection.curl`
- Postman collection: `coworks-api-collection.json`

## Deployment

This project is set up for deployment on Vercel with the following features:
- Tailwind CSS processing
- Next.js API routes
- PostgreSQL integration

## License

[MIT](LICENSE)
=======
2. **User Login**
   ```
   POST /api/auth/login
   ```
   Body:
   ```json
   {
     "email": "user@example.com",
     "password": "SecurePassword123"
   }
   ```
   Response includes:
   - `token`: JWT access token
   - `customer`: User data
   - `role`: User role

3. **Password Reset (if needed)**
   - Request password reset:
     ```
     POST /api/auth/forgot-password
     ```
     Body:
     ```json
     {
       "email": "user@example.com"
     }
     ```
   - Reset password using token:
     ```
     POST /api/auth/reset-password
     ```
     Body:
     ```json
     {
       "token": "reset_token_from_email",
       "password": "NewSecurePassword123",
       "confirmPassword": "NewSecurePassword123"
     }
     ```

4. **Logout**
   ```
   POST /api/auth/logout
   ```
   Headers:
   ```
   Authorization: Bearer your_access_token
   ```

### Admin Authentication

1. **Admin Login**
   ```
   POST /api/admin/auth/login
   ```
   Body:
   ```json
   {
     "username": "admin@example.com", 
     "password": "AdminSecurePassword123"
   }
   ```
   Note: `username` can be either email or username

   Response includes:
   - `token`: JWT access token
   - `admin`: Admin user data with permissions

2. **Admin Password Reset (if needed)**
   - Request password reset:
     ```
     POST /api/admin/auth/forgot-password
     ```
     Body:
     ```json
     {
       "email": "admin@example.com"
     }
     ```
   - Reset password using token:
     ```
     POST /api/admin/auth/reset-password
     ```
     Body:
     ```json
     {
       "token": "reset_token_from_email",
       "password": "NewAdminPassword123",
       "confirmPassword": "NewAdminPassword123"
     }
     ```

## Authentication Headers

For all authenticated API calls, include the token in the header:

```
Authorization: Bearer your_access_token
```

## Role-based Access Control

The system supports the following roles:
- `user`: Regular customer
- `admin`: Admin user with management capabilities
- `super_admin`: Super admin with unrestricted access

Different API endpoints require different roles to access them:
- `/api/admin/*`: Requires `admin` or `super_admin` role
- `/api/admin/super/*`: Requires `super_admin` role

## Troubleshooting Common Issues

### 1. "Invalid authorization header format"
   - Ensure you're using the format: `Authorization: Bearer your_token`
   - Check that there are no extra spaces or characters

### 2. "Login failed: column 'proof_of_identity' does not exist"
   - Run the fix-customers-table endpoint: `GET /api/setup/fix-customers-table`

### 3. "Invalid credentials"
   - Double-check the username/email and password
   - Ensure the user account is active

### 4. "You do not have the required role"
   - The user is attempting to access a resource that requires a higher permission level

### 5. "Failed to generate authentication token"
   - Check if JWT_SECRET is properly set in environment variables

# CoWorks Backend API

## Database Configuration and Error Fixes

This guide provides solutions for common database errors, especially when deploying to Neon and Vercel.

### Environment Variables

Copy the `.env.example` file to `.env` and update the values:

```bash
cp .env.example .env
```

Important environment variables:

```
# For local development
DB_HOST=localhost
DB_PORT=5432
DB_NAME=coworks_db
DB_USER=postgres
DB_PASS=password
DB_SCHEMA=public
DB_SSL=false

# For Neon/Vercel
DATABASE_URL=postgres://user:password@hostname:port/database?sslmode=require
```

### Common Database Errors and Fixes

#### "Column 'proof_of_identity' does not exist" Error

This error occurs when the customers table schema is missing required columns. To fix it:

1. Access the fix endpoint: `/api/setup/fix-customers-table`
2. This public endpoint will add the missing columns to the customers table

#### Connection Errors with Neon

If you experience connection issues with Neon:

1. Ensure SSL is enabled for the connection
2. Check if your connection string is correct
3. Make sure the database pooling settings are appropriate for serverless environment

#### Migration Errors

If migrations fail during deployment:

1. Update the `scripts/vercel-migrate.js` file to include all necessary migrations
2. Deploy the application to run the migrations
3. Manual fix: Run the `/api/setup/fix-customers-table` endpoint

### Running Database Migrations

To manually run migrations:

```bash
# Development environment
npm run migrate

# Vercel environment
npm run vercel-migrate
```

### Database Structure

The key tables and their relationships are:

- `customers` - User accounts
- `branches` - Coworking space locations
- `seating_types` - Types of seats (HD, DD, MR, etc.)
- `seats` - Individual seats at each branch
- `bookings` - User bookings
- `migrations` - Migration history

### Troubleshooting Tips

1. **Connection timeouts**: Increase the connection timeout settings in `database.ts`
2. **Missing columns**: Use the fix endpoint to add missing columns
3. **Authentication errors**: Ensure database credentials are correct
4. **SSL issues**: Make sure SSL is properly configured for production
5. **Schema errors**: Verify the correct schema is being accessed

## File Uploads System

The backend includes a robust file uploads system with the following capabilities:

### Upload Endpoints

- `POST /api/upload` - Upload files to the server (supports profile pictures, branch images, proof of identity, and proof of address)
- `GET /api/files/:path*` - Serve uploaded files (with appropriate cache-control headers)
- `GET /api/uploads` - Admin endpoint to list all uploaded files, categorized by directory

### Upload Directories

The system maintains a structured directory system in the `/uploads` folder:

- `/uploads/profile-pictures` - For user profile images
- `/uploads/branch-images` - For branch location images
- `/uploads/proof-of-identity` - For identity verification documents
- `/uploads/proof-of-address` - For address verification documents
- `/uploads/tmp` - For temporary file storage

### Security Features

- Directory traversal protection
- MIME type validation
- File size limits (5MB max)
- Special cache control for sensitive documents
- Admin-only access to file listing

## Setup and Development

To set up the uploads directory structure, run:

```bash
npm run create-uploads-dir
```

This will create all necessary directories and maintain them in git with empty `.gitkeep` files.
>>>>>>> Stashed changes
=======
2. **User Login**
   ```
   POST /api/auth/login
   ```
   Body:
   ```json
   {
     "email": "user@example.com",
     "password": "SecurePassword123"
   }
   ```
   Response includes:
   - `token`: JWT access token
   - `customer`: User data
   - `role`: User role

3. **Password Reset (if needed)**
   - Request password reset:
     ```
     POST /api/auth/forgot-password
     ```
     Body:
     ```json
     {
       "email": "user@example.com"
     }
     ```
   - Reset password using token:
     ```
     POST /api/auth/reset-password
     ```
     Body:
     ```json
     {
       "token": "reset_token_from_email",
       "password": "NewSecurePassword123",
       "confirmPassword": "NewSecurePassword123"
     }
     ```

4. **Logout**
   ```
   POST /api/auth/logout
   ```
   Headers:
   ```
   Authorization: Bearer your_access_token
   ```

### Admin Authentication

1. **Admin Login**
   ```
   POST /api/admin/auth/login
   ```
   Body:
   ```json
   {
     "username": "admin@example.com", 
     "password": "AdminSecurePassword123"
   }
   ```
   Note: `username` can be either email or username

   Response includes:
   - `token`: JWT access token
   - `admin`: Admin user data with permissions

2. **Admin Password Reset (if needed)**
   - Request password reset:
     ```
     POST /api/admin/auth/forgot-password
     ```
     Body:
     ```json
     {
       "email": "admin@example.com"
     }
     ```
   - Reset password using token:
     ```
     POST /api/admin/auth/reset-password
     ```
     Body:
     ```json
     {
       "token": "reset_token_from_email",
       "password": "NewAdminPassword123",
       "confirmPassword": "NewAdminPassword123"
     }
     ```

## Authentication Headers

For all authenticated API calls, include the token in the header:

```
Authorization: Bearer your_access_token
```

## Role-based Access Control

The system supports the following roles:
- `user`: Regular customer
- `admin`: Admin user with management capabilities
- `super_admin`: Super admin with unrestricted access

Different API endpoints require different roles to access them:
- `/api/admin/*`: Requires `admin` or `super_admin` role
- `/api/admin/super/*`: Requires `super_admin` role

## Troubleshooting Common Issues

### 1. "Invalid authorization header format"
   - Ensure you're using the format: `Authorization: Bearer your_token`
   - Check that there are no extra spaces or characters

### 2. "Login failed: column 'proof_of_identity' does not exist"
   - Run the fix-customers-table endpoint: `GET /api/setup/fix-customers-table`

### 3. "Invalid credentials"
   - Double-check the username/email and password
   - Ensure the user account is active

### 4. "You do not have the required role"
   - The user is attempting to access a resource that requires a higher permission level

### 5. "Failed to generate authentication token"
   - Check if JWT_SECRET is properly set in environment variables

# CoWorks Backend API

## Database Configuration and Error Fixes

This guide provides solutions for common database errors, especially when deploying to Neon and Vercel.

### Environment Variables

Copy the `.env.example` file to `.env` and update the values:

```bash
cp .env.example .env
```

Important environment variables:

```
# For local development
DB_HOST=localhost
DB_PORT=5432
DB_NAME=coworks_db
DB_USER=postgres
DB_PASS=password
DB_SCHEMA=public
DB_SSL=false

# For Neon/Vercel
DATABASE_URL=postgres://user:password@hostname:port/database?sslmode=require
```

### Common Database Errors and Fixes

#### "Column 'proof_of_identity' does not exist" Error

This error occurs when the customers table schema is missing required columns. To fix it:

1. Access the fix endpoint: `/api/setup/fix-customers-table`
2. This public endpoint will add the missing columns to the customers table

#### Connection Errors with Neon

If you experience connection issues with Neon:

1. Ensure SSL is enabled for the connection
2. Check if your connection string is correct
3. Make sure the database pooling settings are appropriate for serverless environment

#### Migration Errors

If migrations fail during deployment:

1. Update the `scripts/vercel-migrate.js` file to include all necessary migrations
2. Deploy the application to run the migrations
3. Manual fix: Run the `/api/setup/fix-customers-table` endpoint

### Running Database Migrations

To manually run migrations:

```bash
# Development environment
npm run migrate

# Vercel environment
npm run vercel-migrate
```

### Database Structure

The key tables and their relationships are:

- `customers` - User accounts
- `branches` - Coworking space locations
- `seating_types` - Types of seats (HD, DD, MR, etc.)
- `seats` - Individual seats at each branch
- `bookings` - User bookings
- `migrations` - Migration history

### Troubleshooting Tips

1. **Connection timeouts**: Increase the connection timeout settings in `database.ts`
2. **Missing columns**: Use the fix endpoint to add missing columns
3. **Authentication errors**: Ensure database credentials are correct
4. **SSL issues**: Make sure SSL is properly configured for production
5. **Schema errors**: Verify the correct schema is being accessed

## File Uploads System

The backend includes a robust file uploads system with the following capabilities:

### Upload Endpoints

- `POST /api/upload` - Upload files to the server (supports profile pictures, branch images, proof of identity, and proof of address)
- `GET /api/files/:path*` - Serve uploaded files (with appropriate cache-control headers)
- `GET /api/uploads` - Admin endpoint to list all uploaded files, categorized by directory

### Upload Directories

The system maintains a structured directory system in the `/uploads` folder:

- `/uploads/profile-pictures` - For user profile images
- `/uploads/branch-images` - For branch location images
- `/uploads/proof-of-identity` - For identity verification documents
- `/uploads/proof-of-address` - For address verification documents
- `/uploads/tmp` - For temporary file storage

### Security Features

- Directory traversal protection
- MIME type validation
- File size limits (5MB max)
- Special cache control for sensitive documents
- Admin-only access to file listing

## Setup and Development

To set up the uploads directory structure, run:

```bash
npm run create-uploads-dir
```

This will create all necessary directories and maintain them in git with empty `.gitkeep` files.
>>>>>>> Stashed changes
