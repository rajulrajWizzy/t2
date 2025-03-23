#!/bin/bash

# User Login
curl -X POST "http://localhost:3000/api/auth/login" -H "Content-Type: application/json" -d '{"email":"user@example.com","password":"password123"}'

# User Registration
curl -X POST "http://localhost:3000/api/auth/register" -H "Content-Type: application/json" -d '{"name":"Test User","email":"test@example.com","password":"password123","phone":"1234567890"}'

# Forgot Password
curl -X POST "http://localhost:3000/api/auth/forgot-password" -H "Content-Type: application/json" -d '{"email":"user@example.com"}'

# Reset Password
curl -X POST "http://localhost:3000/api/auth/reset-password" -H "Content-Type: application/json" -d '{"token":"reset_token","password":"newpassword123"}'

# User Logout
curl -X POST "http://localhost:3000/api/auth/logout" -H "Content-Type: application/json" -H "Authorization: Bearer $USER_TOKEN"

# Admin Login
curl -X POST "http://localhost:3000/api/admin/auth/login" -H "Content-Type: application/json" -d '{"username":"admin","password":"admin123"}'

# Admin Dashboard Statistics
curl -X GET "http://localhost:3000/api/admin/dashboard/stats" -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN"

# List Users
curl -X GET "http://localhost:3000/api/admin/users" -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN"

# Create User
curl -X POST "http://localhost:3000/api/admin/users/create" -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" -d '{"name":"New User","email":"newuser@example.com","password":"password123","phone":"9876543210"}'

# Get User by ID
curl -X GET "http://localhost:3000/api/admin/users/1" -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN"

# Get Admin Profile
curl -X GET "http://localhost:3000/api/admin/profile" -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN"

# Update Admin Profile
curl -X PUT "http://localhost:3000/api/admin/profile/update" -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" -d '{"name":"Updated Admin Name"}'

# List Branches
curl -X GET "http://localhost:3000/api/branches" -H "Content-Type: application/json"

# Get Branch by ID
curl -X GET "http://localhost:3000/api/branches/1" -H "Content-Type: application/json"

# Get Branch Seats
curl -X GET "http://localhost:3000/api/branches/1/seats" -H "Content-Type: application/json"

# Get Branch Statistics
curl -X GET "http://localhost:3000/api/branches/stats" -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN"

# List All Slots
curl -X GET "http://localhost:3000/api/slots" -H "Content-Type: application/json"

# Get Available Slots
curl -X GET "http://localhost:3000/api/slots/available" -H "Content-Type: application/json"

# Get Categorized Slots
curl -X GET "http://localhost:3000/api/slots/categorized" -H "Content-Type: application/json"

# Get Branch Seating Slots
curl -X GET "http://localhost:3000/api/slots/branch-seating" -H "Content-Type: application/json"

# Get Slots by Seating Type
curl -X GET "http://localhost:3000/api/slots/seating-type" -H "Content-Type: application/json"

# Create Booking
curl -X POST "http://localhost:3000/api/bookings" -H "Content-Type: application/json" -H "Authorization: Bearer $USER_TOKEN" -d '{"slot_id":1,"booking_date":"2023-12-01","start_time":"09:00","end_time":"17:00"}'

# Get Booking by ID
curl -X GET "http://localhost:3000/api/bookings/1" -H "Content-Type: application/json" -H "Authorization: Bearer $USER_TOKEN"

# List User Bookings
curl -X GET "http://localhost:3000/api/bookings" -H "Content-Type: application/json" -H "Authorization: Bearer $USER_TOKEN"

# Get User Profile
curl -X GET "http://localhost:3000/api/profile" -H "Content-Type: application/json" -H "Authorization: Bearer $USER_TOKEN"

# Upload Profile Picture
curl -X POST "http://localhost:3000/api/profile/upload" -H "Content-Type: application/json" -H "Authorization: Bearer $USER_TOKEN"

# Get Verification Status
curl -X GET "http://localhost:3000/api/profile/verification-status" -H "Content-Type: application/json" -H "Authorization: Bearer $USER_TOKEN"