#!/bin/bash
# Coworks Admin API Testing Script
# Replace domain with your actual API domain

API_BASE="https://your-api-domain.com"

# Step 1: Login as an existing super admin
echo "Logging in as existing admin..."
LOGIN_RESPONSE=$(curl -s -X POST \
  "${API_BASE}/api/admin/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin_password"
  }')

# Extract token from response
TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | sed 's/"token":"//')

if [ -z "$TOKEN" ]; then
  echo "Failed to login or extract token."
  echo "Response was: $LOGIN_RESPONSE"
  exit 1
fi

echo "Successfully logged in and obtained token."

# Step 2: Create a branch admin
echo "Creating branch admin..."
BRANCH_ADMIN_RESPONSE=$(curl -s -X POST \
  "${API_BASE}/api/admin/users/create" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "branchadmin",
    "email": "branchadmin@example.com",
    "password": "admin123",
    "name": "Branch Admin",
    "role": "branch_admin",
    "branch_id": 1
  }')

echo "Branch admin creation response:"
echo "$BRANCH_ADMIN_RESPONSE" | json_pp

# Step 3: Create a super admin
echo "Creating super admin..."
SUPER_ADMIN_RESPONSE=$(curl -s -X POST \
  "${API_BASE}/api/admin/users/create" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "superadmin",
    "email": "superadmin@example.com",
    "password": "admin123",
    "name": "Super Admin",
    "role": "super_admin"
  }')

echo "Super admin creation response:"
echo "$SUPER_ADMIN_RESPONSE" | json_pp

# Step 4: Test login with new super admin
echo "Testing login with new super admin..."
SUPER_ADMIN_LOGIN=$(curl -s -X POST \
  "${API_BASE}/api/admin/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "superadmin",
    "password": "admin123"
  }')

echo "Super admin login response:"
echo "$SUPER_ADMIN_LOGIN" | json_pp

# Step 5: Test login with new branch admin
echo "Testing login with new branch admin..."
BRANCH_ADMIN_LOGIN=$(curl -s -X POST \
  "${API_BASE}/api/admin/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "branchadmin",
    "password": "admin123"
  }')

echo "Branch admin login response:"
echo "$BRANCH_ADMIN_LOGIN" | json_pp

echo "Admin creation and testing complete."

# Individual curl commands for reference:

: '
# Login as admin
curl -X POST \
  "https://your-api-domain.com/api/admin/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin_password"
  }'

# Create branch admin
curl -X POST \
  "https://your-api-domain.com/api/admin/users/create" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "branchadmin",
    "email": "branchadmin@example.com",
    "password": "admin123",
    "name": "Branch Admin",
    "role": "branch_admin",
    "branch_id": 1
  }'

# Create super admin
curl -X POST \
  "https://your-api-domain.com/api/admin/users/create" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "superadmin",
    "email": "superadmin@example.com",
    "password": "admin123",
    "name": "Super Admin",
    "role": "super_admin"
  }'

# Test login as super admin
curl -X POST \
  "https://your-api-domain.com/api/admin/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "superadmin",
    "password": "admin123"
  }'

# Test login as branch admin
curl -X POST \
  "https://your-api-domain.com/api/admin/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "branchadmin",
    "password": "admin123"
  }'
' 