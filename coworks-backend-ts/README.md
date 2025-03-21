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

This project is set up for deployment on Vercel with the following features:
- Tailwind CSS processing
- Next.js API routes
- PostgreSQL integration

## License

[MIT](LICENSE)