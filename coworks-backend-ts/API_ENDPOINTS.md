# CoWorks API Endpoints

This document lists all API endpoints available in the CoWorks backend.

## Table of Contents

- [Authentication Endpoints](#authentication-endpoints)
- [User API Endpoints](#user-api-endpoints)
- [Admin API Endpoints](#admin-api-endpoints)
- [Public API Endpoints](#public-api-endpoints)

# Admin API Endpoints

These endpoints are intended for admin use and require admin authentication.

No endpoints in this category.

# User API Endpoints

These endpoints are for regular users.

| Method | Path | Authentication | Path Parameters | Source File |
| ------ | ---- | -------------- | --------------- | ----------- |
| GET | `/api/admin/branches` | Admin | None | src/app/api/admin/branches/route.ts |
| POST | `/api/admin/branches` | Admin | None | src/app/api/admin/branches/route.ts |
| GET | `/api/admin/customers/verify` | Admin | None | src/app/api/admin/customers/verify/route.ts |
| POST | `/api/admin/customers/verify` | Admin | None | src/app/api/admin/customers/verify/route.ts |
| GET | `/api/admin/dashboard/stats` | Admin | None | src/app/api/admin/dashboard/stats/route.ts |
| GET | `/api/admin/profile` | Admin | None | src/app/api/admin/profile/route.ts |
| PUT | `/api/admin/profile/update` | Admin | None | src/app/api/admin/profile/update/route.ts |
| GET | `/api/admin/seating-types` | Admin | None | src/app/api/admin/seating-types/route.ts |
| POST | `/api/admin/seating-types` | Admin | None | src/app/api/admin/seating-types/route.ts |
| GET | `/api/admin/seating-types/:id` | Admin | None | src/app/api/admin/seating-types/[id]/route.ts |
| PUT | `/api/admin/seating-types/:id` | Admin | None | src/app/api/admin/seating-types/[id]/route.ts |
| DELETE | `/api/admin/seating-types/:id` | Admin | None | src/app/api/admin/seating-types/[id]/route.ts |
| GET | `/api/admin/seats/capacity` | Admin | None | src/app/api/admin/seats/capacity/route.ts |
| POST | `/api/admin/seats/capacity` | Admin | None | src/app/api/admin/seats/capacity/route.ts |
| PATCH | `/api/admin/seats/capacity` | Admin | None | src/app/api/admin/seats/capacity/route.ts |
| GET | `/api/admin/super/stats` | Super Admin | None | src/app/api/admin/super/stats/route.ts |
| GET | `/api/admin/support/tickets` | Admin | None | src/app/api/admin/support/tickets/route.ts |
| POST | `/api/admin/support/tickets/:ticket_id/messages` | Admin | None | src/app/api/admin/support/tickets/[ticket_id]/messages/route.ts |
| GET | `/api/admin/support/tickets/:ticket_id` | Admin | None | src/app/api/admin/support/tickets/[ticket_id]/route.ts |
| PUT | `/api/admin/support/tickets/:ticket_id` | Admin | None | src/app/api/admin/support/tickets/[ticket_id]/route.ts |
| POST | `/api/admin/users/create` | Super Admin | None | src/app/api/admin/users/create/route.ts |
| GET | `/api/admin/users` | Admin | None | src/app/api/admin/users/route.ts |
| GET | `/api/admin/users/:id` | Admin | None | src/app/api/admin/users/[id]/route.ts |
| PUT | `/api/admin/users/:id` | Admin | None | src/app/api/admin/users/[id]/route.ts |
| DELETE | `/api/admin/users/:id` | Admin | None | src/app/api/admin/users/[id]/route.ts |
| POST | `/api/branches/images/upload` | User | None | src/app/api/branches/images/upload/route.ts |
| DELETE | `/api/branches/images/upload` | User | None | src/app/api/branches/images/upload/route.ts |
| PATCH | `/api/branches/images/upload` | User | None | src/app/api/branches/images/upload/route.ts |
| POST | `/api/profile/upload` | User | None | src/app/api/profile/upload/route.ts |
| PATCH | `/api/profile/upload` | User | None | src/app/api/profile/upload/route.ts |
| POST | `/api/support/tickets/messages` | User | None | src/app/api/support/tickets/messages/route.ts |
| GET | `/api/support/tickets` | User | None | src/app/api/support/tickets/route.ts |
| POST | `/api/support/tickets` | User | None | src/app/api/support/tickets/route.ts |
| GET | `/api/support/tickets/:ticket_id` | User | None | src/app/api/support/tickets/[ticket_id]/route.ts |
| PUT | `/api/support/tickets/:ticket_id` | User | None | src/app/api/support/tickets/[ticket_id]/route.ts |

# Authentication Endpoints

These endpoints handle user and admin authentication.

No endpoints in this category.

# Public API Endpoints

These endpoints are publicly accessible without authentication.

| Method | Path | Authentication | Path Parameters | Source File |
| ------ | ---- | -------------- | --------------- | ----------- |
| POST | `/api/admin/auth/login` | None | None | src/app/api/admin/auth/login/route.ts |
| OPTIONS | `/api/admin/auth/login` | None | None | src/app/api/admin/auth/login/route.ts |
| POST | `/api/auth/forgot-password` | None | None | src/app/api/auth/forgot-password/route.ts |
| POST | `/api/auth/login` | None | None | src/app/api/auth/login/route.ts |
| POST | `/api/auth/logout` | None | None | src/app/api/auth/logout/route.ts |
| POST | `/api/auth/register` | None | None | src/app/api/auth/register/route.ts |
| POST | `/api/auth/reset-password` | None | None | src/app/api/auth/reset-password/route.ts |
| GET | `/api/bookings` | None | None | src/app/api/bookings/route.ts |
| POST | `/api/bookings` | None | None | src/app/api/bookings/route.ts |
| GET | `/api/bookings/:id` | None | None | src/app/api/bookings/[id]/route.ts |
| PUT | `/api/bookings/:id` | None | None | src/app/api/bookings/[id]/route.ts |
| DELETE | `/api/bookings/:id` | None | None | src/app/api/bookings/[id]/route.ts |
| POST | `/api/branches/bulk` | None | None | src/app/api/branches/bulk/route.ts |
| GET | `/api/branches` | None | None | src/app/api/branches/route.ts |
| POST | `/api/branches` | None | None | src/app/api/branches/route.ts |
| GET | `/api/branches/stats` | None | None | src/app/api/branches/stats/route.ts |
| GET | `/api/branches/:id` | None | None | src/app/api/branches/[id]/route.ts |
| PUT | `/api/branches/:id` | None | None | src/app/api/branches/[id]/route.ts |
| DELETE | `/api/branches/:id` | None | None | src/app/api/branches/[id]/route.ts |
| GET | `/api/branches/:id/seats` | None | None | src/app/api/branches/[id]/seats/route.ts |
| GET | `/api/database-status` | None | None | src/app/api/database-status/route.ts |
| OPTIONS | `/api/database-status` | None | None | src/app/api/database-status/route.ts |
| GET | `/api/payments` | None | None | src/app/api/payments/route.ts |
| POST | `/api/payments` | None | None | src/app/api/payments/route.ts |
| GET | `/api/payments/:id` | None | None | src/app/api/payments/[id]/route.ts |
| PUT | `/api/payments/:id` | None | None | src/app/api/payments/[id]/route.ts |
| GET | `/api/placeholder/:path*` | None | None | src/app/api/placeholder/[...path]/route.ts |
| GET | `/api/profile` | None | None | src/app/api/profile/route.ts |
| PATCH | `/api/profile` | None | None | src/app/api/profile/route.ts |
| GET | `/api/profile/verification-status` | None | None | src/app/api/profile/verification-status/route.ts |
| GET | `/api/seat` | None | None | src/app/api/seat/route.ts |
| POST | `/api/seat` | None | None | src/app/api/seat/route.ts |
| GET | `/api/seat/:id` | None | None | src/app/api/seat/[id]/route.ts |
| PUT | `/api/seat/:id` | None | None | src/app/api/seat/[id]/route.ts |
| DELETE | `/api/seat/:id` | None | None | src/app/api/seat/[id]/route.ts |
| GET | `/api/seating-types` | None | None | src/app/api/seating-types/route.ts |
| POST | `/api/seating-types` | None | None | src/app/api/seating-types/route.ts |
| GET | `/api/slots/available` | None | None | src/app/api/slots/available/route.ts |
| GET | `/api/slots/branch-seating` | None | None | src/app/api/slots/branch-seating/route.ts |
| GET | `/api/slots/categorized` | None | None | src/app/api/slots/categorized/route.ts |
| GET | `/api/slots` | None | None | src/app/api/slots/route.ts |
| POST | `/api/slots` | None | None | src/app/api/slots/route.ts |
| GET | `/api/slots/seating-type` | None | None | src/app/api/slots/seating-type/route.ts |
| GET | `/api/status` | None | None | src/app/api/status/route.ts |
| GET | `/api/test` | None | None | src/app/api/test/route.ts |
| POST | `/api/upload` | None | None | src/app/api/upload/route.ts |

# API Authentication Guide

## User Authentication

To authenticate user requests:

1. First obtain a token by calling the `/api/auth/login` endpoint with valid credentials
2. Include the token in the `Authorization` header of subsequent requests:

```
Authorization: Bearer YOUR_TOKEN
```

## Admin Authentication

To authenticate admin requests:

1. Obtain a token by calling the `/api/admin/auth/login` endpoint with valid admin credentials
2. Include the token in the `Authorization` header of subsequent requests:

```
Authorization: Bearer YOUR_ADMIN_TOKEN
```

## Authentication Levels

- **None**: No authentication required
- **User**: Regular user authentication required
- **Admin**: General admin authentication required
- **Super Admin**: Super admin role required
- **Branch Admin**: Branch admin role with access to the specified branch
