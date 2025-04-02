#!/bin/bash
# Coworks Admin API Test Script
# This script tests the admin authentication and super admin management APIs

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Replace with your API domain
API_BASE="https://your-vercel-domain.com"

# Store tokens and IDs
SUPER_ADMIN_TOKEN=""
BRANCH_ADMIN_TOKEN=""
NEW_ADMIN_ID=""

# Print section header
print_header() {
  echo -e "\n${BLUE}=======================================${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}=======================================${NC}"
}

# Format JSON output with jq if available, otherwise use cat
format_json() {
  if command -v jq &> /dev/null; then
    jq .
  else
    cat
  fi
}

# Super Admin Login
print_header "1. Super Admin Login"
echo "Logging in as super admin..."
LOGIN_RESPONSE=$(curl -s -X POST \
  "${API_BASE}/api/admin/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "superadmin",
    "password": "CoWorks@SuperAdmin2023"
  }')

echo "Response:" | format_json
echo "$LOGIN_RESPONSE" | format_json

# Extract token from response
SUPER_ADMIN_TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | sed 's/"token":"//')

if [ -z "$SUPER_ADMIN_TOKEN" ]; then
  echo -e "${RED}Failed to extract token. Exiting...${NC}"
  exit 1
fi

echo -e "${GREEN}Successfully obtained super admin token${NC}"

# Get Admin Profile
print_header "2. Get Admin Profile"
echo "Fetching super admin profile..."
PROFILE_RESPONSE=$(curl -s -X GET \
  "${API_BASE}/api/admin/profile" \
  -H "Authorization: Bearer $SUPER_ADMIN_TOKEN")

echo "Response:" | format_json
echo "$PROFILE_RESPONSE" | format_json

# Create Branch Admin
print_header "3. Create Branch Admin"
echo "Creating a branch admin user..."
CREATE_RESPONSE=$(curl -s -X POST \
  "${API_BASE}/api/admin/users/create" \
  -H "Authorization: Bearer $SUPER_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "branchadmin",
    "email": "branchadmin@example.com",
    "password": "BranchAdmin@123",
    "name": "Branch Admin",
    "role": "branch_admin",
    "branch_id": 1
  }')

echo "Response:" | format_json
echo "$CREATE_RESPONSE" | format_json

# Get Admin Users
print_header "4. Get All Admin Users"
echo "Fetching all admin users..."
USERS_RESPONSE=$(curl -s -X GET \
  "${API_BASE}/api/admin/users" \
  -H "Authorization: Bearer $SUPER_ADMIN_TOKEN")

echo "Response:" | format_json
echo "$USERS_RESPONSE" | format_json

# Extract branch admin ID if available
BRANCH_ADMIN_ID=$(echo $USERS_RESPONSE | grep -o '"id":[0-9]*.*"username":"branchadmin"' | grep -o '"id":[0-9]*' | head -1 | sed 's/"id"://')

if [ -z "$BRANCH_ADMIN_ID" ]; then
  echo -e "${YELLOW}Could not extract branch admin ID, using ID 2 as default${NC}"
  BRANCH_ADMIN_ID=2
else
  echo -e "${GREEN}Found branch admin with ID: $BRANCH_ADMIN_ID${NC}"
fi

# Branch Admin Login
print_header "5. Branch Admin Login"
echo "Logging in as branch admin..."
BRANCH_LOGIN_RESPONSE=$(curl -s -X POST \
  "${API_BASE}/api/admin/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "branchadmin",
    "password": "BranchAdmin@123"
  }')

echo "Response:" | format_json
echo "$BRANCH_LOGIN_RESPONSE" | format_json

# Extract branch admin token
BRANCH_ADMIN_TOKEN=$(echo $BRANCH_LOGIN_RESPONSE | grep -o '"token":"[^"]*' | sed 's/"token":"//')

if [ -z "$BRANCH_ADMIN_TOKEN" ]; then
  echo -e "${RED}Failed to extract branch admin token${NC}"
else
  echo -e "${GREEN}Successfully obtained branch admin token${NC}"
fi

# Branch Admin Tries to Create Super Admin (Should Fail)
print_header "6. Branch Admin Tries to Create Super Admin (Should Fail)"
echo "Branch admin attempting to create a super admin (unauthorized action)..."
UNAUTH_CREATE_RESPONSE=$(curl -s -X POST \
  "${API_BASE}/api/admin/users/create" \
  -H "Authorization: Bearer $BRANCH_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "newsuperadmin",
    "email": "newsuperadmin@example.com",
    "password": "SuperAdmin@123",
    "name": "New Super Admin",
    "role": "super_admin"
  }')

echo "Response:" | format_json
echo "$UNAUTH_CREATE_RESPONSE" | format_json

# Create Another Super Admin
print_header "7. Create Another Super Admin"
echo "Super admin creating another super admin..."
SUPER_CREATE_RESPONSE=$(curl -s -X POST \
  "${API_BASE}/api/admin/users/create" \
  -H "Authorization: Bearer $SUPER_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "anothersuperadmin",
    "email": "anothersuperadmin@example.com",
    "password": "SuperAdmin@123",
    "name": "Another Super Admin",
    "role": "super_admin"
  }')

echo "Response:" | format_json
echo "$SUPER_CREATE_RESPONSE" | format_json

# Extract new super admin ID if available
NEW_ADMIN_ID=$(echo $SUPER_CREATE_RESPONSE | grep -o '"id":[0-9]*' | head -1 | sed 's/"id"://')

if [ -z "$NEW_ADMIN_ID" ]; then
  echo -e "${YELLOW}Could not extract new super admin ID, using ID 3 as default${NC}"
  NEW_ADMIN_ID=3
else
  echo -e "${GREEN}Created new super admin with ID: $NEW_ADMIN_ID${NC}"
fi

# Update Admin User
print_header "8. Update Admin User"
echo "Updating the branch admin user..."
UPDATE_RESPONSE=$(curl -s -X PUT \
  "${API_BASE}/api/admin/users/$BRANCH_ADMIN_ID" \
  -H "Authorization: Bearer $SUPER_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Branch Admin",
    "email": "updated.branchadmin@example.com"
  }')

echo "Response:" | format_json
echo "$UPDATE_RESPONSE" | format_json

# Get Admin Dashboard Stats
print_header "9. Get Admin Dashboard Stats"
echo "Fetching admin dashboard statistics..."
STATS_RESPONSE=$(curl -s -X GET \
  "${API_BASE}/api/admin/dashboard/stats" \
  -H "Authorization: Bearer $SUPER_ADMIN_TOKEN")

echo "Response:" | format_json
echo "$STATS_RESPONSE" | format_json

# Get Super Admin Stats
print_header "10. Get Super Admin Stats"
echo "Fetching super admin dashboard statistics..."
SUPER_STATS_RESPONSE=$(curl -s -X GET \
  "${API_BASE}/api/admin/super/stats" \
  -H "Authorization: Bearer $SUPER_ADMIN_TOKEN")

echo "Response:" | format_json
echo "$SUPER_STATS_RESPONSE" | format_json

# Try to Delete Original Super Admin (Should Fail if Last One)
print_header "11. Try to Delete Original Super Admin (Should Fail if Last One)"
echo "Attempting to delete the original super admin..."
DELETE_RESPONSE=$(curl -s -X DELETE \
  "${API_BASE}/api/admin/users/1" \
  -H "Authorization: Bearer $SUPER_ADMIN_TOKEN")

echo "Response:" | format_json
echo "$DELETE_RESPONSE" | format_json

# Delete New Super Admin
print_header "12. Delete New Super Admin"
echo "Deleting the newly created super admin..."
DELETE_NEW_RESPONSE=$(curl -s -X DELETE \
  "${API_BASE}/api/admin/users/$NEW_ADMIN_ID" \
  -H "Authorization: Bearer $SUPER_ADMIN_TOKEN")

echo "Response:" | format_json
echo "$DELETE_NEW_RESPONSE" | format_json

# Reset Password for Branch Admin
print_header "13. Reset Password for Branch Admin"
echo "Resetting password for branch admin..."
RESET_PASSWORD_RESPONSE=$(curl -s -X PUT \
  "${API_BASE}/api/admin/users/$BRANCH_ADMIN_ID" \
  -H "Authorization: Bearer $SUPER_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "password": "NewBranchAdmin@456"
  }')

echo "Response:" | format_json
echo "$RESET_PASSWORD_RESPONSE" | format_json

print_header "Admin API Testing Complete"
echo -e "${GREEN}Successfully tested the admin API endpoints${NC}"
echo -e "${YELLOW}Remember to change the default super admin password after the first login!${NC}" 