# CoWorks Backend API Documentation

This document provides a comprehensive overview of all API endpoints available in the CoWorks backend.

## Base URL

All API endpoints are relative to the base URL: `https://api.coworks.example.com` (replace with your actual production URL)

For local development: `http://localhost:3000`

## Authentication

Most endpoints require authentication. Authentication is handled using JWT (JSON Web Tokens).

- For authenticated requests, include the token in the Authorization header:
  ```
  Authorization: Bearer <your_token>
  ```

- Tokens are obtained via the login endpoints.

## API Endpoints

### Authentication Endpoints

| Method | Path | Auth Required | Description |
|--------|------|---------------|-------------|
| POST | `/api/auth/register` | No | Register a new user |
| POST | `/api/auth/login` | No | Login as a user |
| POST | `/api/auth/logout` | Yes (User) | Logout and invalidate token |
| POST | `/api/auth/forgot-password` | No | Request a password reset link |
| POST | `/api/auth/reset-password` | No | Reset password with token |
| POST | `/api/admin/auth/login` | No | Login as admin |
| POST | `/api/admin/auth/forgot-password` | No | Request admin password reset |
| POST | `/api/admin/auth/reset-password` | No | Reset admin password with token |

### User API Endpoints

| Method | Path | Auth Required | Description |
|--------|------|---------------|-------------|
| GET | `/api/profile` | Yes (User) | Get user profile |
| PATCH | `/api/profile` | Yes (User) | Update user profile |
| POST | `/api/profile/upload` | Yes (User) | Upload profile picture |
| GET | `/api/profile/verification-status` | Yes (User) | Check verification status |
| POST | `/api/profile/documents` | Yes (User) | Upload verification documents |
| GET | `/api/branches` | No | Get all branches |
| GET | `/api/branches/:id` | No | Get branch by ID |
| GET | `/api/branches/:shortCode` | No | Get branch by short code |
| GET | `/api/branches?seating_type_code=:code` | No | Filter branches by seating type |
| GET | `/api/seating-types` | No | Get all seating types |
| GET | `/api/seating-types/:id` | No | Get seating type by ID |
| GET | `/api/bookings` | Yes (User) | Get user bookings |
| POST | `/api/bookings` | Yes (User) | Create a booking |
| DELETE | `/api/bookings/:id` | Yes (User) | Cancel a booking |
| GET | `/api/bookings/available-slots` | Yes (User) | Get available time slots |
| GET | `/api/coins` | Yes (User) | Get coins balance |
| GET | `/api/coins/history` | Yes (User) | Get coins usage history |
| POST | `/api/coins/transfer` | Yes (User) | Transfer coins to cash |
| GET | `/api/support/tickets` | Yes (User) | Get support tickets |
| POST | `/api/support/tickets` | Yes (User) | Create support ticket |
| GET | `/api/support/tickets/:id` | Yes (User) | Get ticket details |
| POST | `/api/support/tickets/:id/messages` | Yes (User) | Add message to ticket |

### Admin API Endpoints

| Method | Path | Auth Required | Description |
|--------|------|---------------|-------------|
| GET | `/api/admin/profile` | Yes (Admin) | Get admin profile |
| PATCH | `/api/admin/profile` | Yes (Admin) | Update admin profile |
| GET | `/api/admin/users` | Yes (Admin) | Get all users |
| GET | `/api/admin/users/:id` | Yes (Admin) | Get user by ID |
| PUT | `/api/admin/users/:id` | Yes (Admin) | Update user |
| GET | `/api/admin/branches` | Yes (Admin) | Get all branches |
| GET | `/api/admin/branches/:id` | Yes (Admin) | Get branch by ID |
| POST | `/api/admin/branches` | Yes (Admin) | Create new branch |
| PUT | `/api/admin/branches/:id` | Yes (Admin) | Update branch |
| DELETE | `/api/admin/branches/:id` | Yes (Admin) | Delete branch |
| GET | `/api/admin/bookings` | Yes (Admin) | Get all bookings |
| GET | `/api/admin/bookings/:id` | Yes (Admin) | Get booking details |
| PUT | `/api/admin/bookings/:id/status` | Yes (Admin) | Update booking status |
| GET | `/api/admin/seating-types` | Yes (Admin) | Get all seating types |
| POST | `/api/admin/seating-types` | Yes (Admin) | Create seating type |
| PUT | `/api/admin/seating-types/:id` | Yes (Admin) | Update seating type |
| DELETE | `/api/admin/seating-types/:id` | Yes (Admin) | Delete seating type |
| GET | `/api/admin/dashboard/stats` | Yes (Admin) | Get dashboard statistics |

### SuperAdmin API Endpoints

| Method | Path | Auth Required | Description |
|--------|------|---------------|-------------|
| GET | `/api/admin/users` | Yes (SuperAdmin) | Get all admin users |
| GET | `/api/admin/users/:id` | Yes (SuperAdmin) | Get admin by ID |
| POST | `/api/admin/users/create` | Yes (SuperAdmin) | Create admin user |
| PUT | `/api/admin/users/:id` | Yes (SuperAdmin) | Update admin user |
| DELETE | `/api/admin/users/:id` | Yes (SuperAdmin) | Delete admin user |
| PUT | `/api/admin/users/:id/permissions` | Yes (SuperAdmin) | Update admin permissions |
| GET | `/api/admin/super/stats` | Yes (SuperAdmin) | Get overall analytics |
| GET | `/api/database-status` | Yes (SuperAdmin) | Check database status |
| POST | `/api/admin/super/system/cache` | Yes (SuperAdmin) | Clear system cache |
| GET | `/api/admin/super/system/logs` | Yes (SuperAdmin) | Get system logs |

### Public API Endpoints

| Method | Path | Auth Required | Description |
|--------|------|---------------|-------------|
| GET | `/api/status` | No | Check API status |
| GET | `/api/branches` | No | Get all branches (public view) |
| GET | `/api/branches/:id` | No | Get branch details (public view) |
| GET | `/api/seating-types` | No | Get all seating types (public view) |

## Error Handling

All API endpoints follow a standard error response format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  }
}
```

Common error codes:
- `UNAUTHORIZED`: Authentication token is missing or invalid
- `FORBIDDEN`: User does not have permission to access the resource
- `NOT_FOUND`: Requested resource was not found
- `VALIDATION_ERROR`: Request data failed validation
- `INTERNAL_ERROR`: An unexpected server error occurred
