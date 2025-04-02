#!/bin/bash

# Coworks API Testing Script
# This script tests all API endpoints in the Coworks system

# Set the base URL
BASE_URL="http://localhost:3000"

# Initialize variables for tokens
USER_TOKEN=""
ADMIN_TOKEN=""
SUPER_ADMIN_TOKEN=""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to make API requests and display results
call_api() {
    local method=$1
    local endpoint=$2
    local data=$3
    local auth_header=$4
    local description=$5

    echo -e "${BLUE}Testing: ${description}${NC}"
    echo -e "${YELLOW}${method} ${endpoint}${NC}"
    
    # Build the curl command
    cmd="curl -s -X ${method} \"${BASE_URL}${endpoint}\" -H \"Content-Type: application/json\""
    
    # Add authorization header if provided
    if [ ! -z "$auth_header" ]; then
        cmd="$cmd -H \"Authorization: Bearer $auth_header\""
    fi
    
    # Add data if provided
    if [ ! -z "$data" ]; then
        cmd="$cmd -d '${data}'"
    fi
    
    # Execute the command and save response
    echo -e "${YELLOW}Request:${NC} $cmd"
    response=$(eval $cmd)
    
    # Check if response is valid JSON
    if echo "$response" | jq . >/dev/null 2>&1; then
        # Pretty print and extract success status
        success=$(echo "$response" | jq -r '.success // false')
        echo -e "${YELLOW}Response:${NC}"
        echo "$response" | jq .
        
        if [ "$success" = "true" ]; then
            echo -e "${GREEN}✓ Success${NC}"
        else
            echo -e "${RED}✗ Failed${NC}"
        fi
    else
        echo -e "${RED}Invalid JSON response:${NC}"
        echo "$response"
        echo -e "${RED}✗ Failed${NC}"
    fi
    
    echo -e "--------------------------------------\n"
    
    # Return response for further processing if needed
    echo "$response"
}

# Function to extract token from response
extract_token() {
    local response=$1
    local token=$(echo "$response" | jq -r '.data.token // empty')
    echo "$token"
}

echo -e "${BLUE}==========================================${NC}"
echo -e "${BLUE}Coworks API Testing Suite${NC}"
echo -e "${BLUE}==========================================${NC}\n"

echo -e "${BLUE}TESTING COMMON AUTHENTICATION ENDPOINTS${NC}\n"

# 1. Register User
user_register_response=$(call_api "POST" "/api/auth/register" '{
  "name": "Test User",
  "email": "testuser@example.com",
  "phone": "1234567890",
  "password": "Password123!",
  "company_name": "Test Company"
}' "" "Register User")

# 2. Login User
user_login_response=$(call_api "POST" "/api/auth/login" '{
  "email": "testuser@example.com",
  "password": "Password123!"
}' "" "Login User")

# Extract user token
USER_TOKEN=$(extract_token "$user_login_response")
if [ ! -z "$USER_TOKEN" ]; then
    echo -e "${GREEN}User token obtained: ${USER_TOKEN:0:10}...${NC}\n"
else
    echo -e "${RED}Failed to obtain user token${NC}\n"
fi

# 3. Admin Login
admin_login_response=$(call_api "POST" "/api/admin/auth/login" '{
  "username": "admin",
  "password": "Admin@123"
}' "" "Admin Login")

# Extract admin token
ADMIN_TOKEN=$(extract_token "$admin_login_response")
if [ ! -z "$ADMIN_TOKEN" ]; then
    # Check if admin is super_admin
    admin_role=$(echo "$admin_login_response" | jq -r '.data.admin.role // empty')
    if [ "$admin_role" = "super_admin" ]; then
        SUPER_ADMIN_TOKEN=$ADMIN_TOKEN
        echo -e "${GREEN}Super Admin token obtained: ${SUPER_ADMIN_TOKEN:0:10}...${NC}\n"
    else
        echo -e "${GREEN}Branch Admin token obtained: ${ADMIN_TOKEN:0:10}...${NC}\n"
    fi
else
    echo -e "${RED}Failed to obtain admin token${NC}\n"
fi

echo -e "${BLUE}TESTING USER ENDPOINTS${NC}\n"

if [ ! -z "$USER_TOKEN" ]; then
    # 4. Get User Profile
    call_api "GET" "/api/profile" "" "$USER_TOKEN" "Get User Profile"
    
    # 5. Update User Profile
    call_api "PUT" "/api/profile" '{
      "name": "Updated Test User",
      "phone": "9876543210",
      "company_name": "Updated Test Company"
    }' "$USER_TOKEN" "Update User Profile"
    
    # 6. Get All Branches
    call_api "GET" "/api/branches?page=1&limit=10" "" "$USER_TOKEN" "Get All Branches"
    
    # 7. Get Branch by ID (assuming ID 1 exists)
    branch_response=$(call_api "GET" "/api/branches/1" "" "$USER_TOKEN" "Get Branch by ID")
    
    # 8. Get Available Slots (assuming branch ID 1 exists)
    call_api "GET" "/api/slots?branch_id=1&date=2023-06-15" "" "$USER_TOKEN" "Get Available Slots"
    
    # 9. Create Booking (assuming seat ID 1 exists)
    booking_response=$(call_api "POST" "/api/bookings" '{
      "seat_id": 1,
      "date": "2023-06-15",
      "start_time": "09:00",
      "end_time": "17:00",
      "notes": "Test booking"
    }' "$USER_TOKEN" "Create Booking")
    
    # Extract booking ID for cancellation test
    booking_id=$(echo "$booking_response" | jq -r '.data.id // 1')
    
    # 10. Get My Bookings
    call_api "GET" "/api/bookings/my-bookings?page=1&limit=10" "" "$USER_TOKEN" "Get My Bookings"
    
    # 11. Cancel Booking
    if [ "$booking_id" != "null" ]; then
        call_api "DELETE" "/api/bookings/$booking_id" "" "$USER_TOKEN" "Cancel Booking"
    fi
else
    echo -e "${RED}Skipping user endpoint tests due to missing token${NC}\n"
fi

echo -e "${BLUE}TESTING BRANCH ADMIN ENDPOINTS${NC}\n"

if [ ! -z "$ADMIN_TOKEN" ]; then
    # 12. Get Branch Details
    call_api "GET" "/api/admin/branches/my-branch" "" "$ADMIN_TOKEN" "Get Branch Details"
    
    # 13. Get Branch Seats
    call_api "GET" "/api/admin/seats/branch" "" "$ADMIN_TOKEN" "Get Branch Seats"
    
    # 14. View Branch Bookings
    call_api "GET" "/api/admin/bookings/branch?date=2023-06-15" "" "$ADMIN_TOKEN" "View Branch Bookings"
    
    # 15. Create Customer Support Ticket (assuming customer ID 1 exists)
    call_api "POST" "/api/admin/support" '{
      "customer_id": 1,
      "subject": "Test Support Ticket",
      "description": "This is a test support ticket",
      "priority": "MEDIUM"
    }' "$ADMIN_TOKEN" "Create Customer Support Ticket"
else
    echo -e "${RED}Skipping branch admin endpoint tests due to missing token${NC}\n"
fi

echo -e "${BLUE}TESTING SUPER ADMIN ENDPOINTS${NC}\n"

if [ ! -z "$SUPER_ADMIN_TOKEN" ]; then
    # 16. Get All Admins
    call_api "GET" "/api/admin/super/admins" "" "$SUPER_ADMIN_TOKEN" "Get All Admins"
    
    # 17. View All Customers
    call_api "GET" "/api/admin/customers?page=1&limit=20" "" "$SUPER_ADMIN_TOKEN" "View All Customers"
    
    # 18. View All Bookings
    call_api "GET" "/api/admin/bookings?page=1&limit=20" "" "$SUPER_ADMIN_TOKEN" "View All Bookings"
    
    # 19. Dashboard Statistics
    call_api "GET" "/api/admin/dashboard/stats" "" "$SUPER_ADMIN_TOKEN" "Dashboard Statistics"
    
    # 20. Create Seating Type
    seating_type_response=$(call_api "POST" "/api/admin/seating-types" '{
      "name": "Test Seating Type",
      "code": "TESTST",
      "description": "Test seating type for API testing",
      "base_price_hourly": 25,
      "base_price_daily": 150,
      "base_price_monthly": 3000,
      "capacity": 2,
      "image": "https://example.com/test-seating-type.jpg"
    }' "$SUPER_ADMIN_TOKEN" "Create Seating Type")
    
    # Extract seating type ID for seat creation
    seating_type_id=$(echo "$seating_type_response" | jq -r '.data.id // 1')
    
    # 21. Create Branch
    branch_response=$(call_api "POST" "/api/admin/branches" '{
      "name": "Test Branch",
      "address": "123 Test St, Test City",
      "location": "Test Location",
      "latitude": 12.345,
      "longitude": 67.890,
      "cost_multiplier": 1.0,
      "opening_time": "08:00:00",
      "closing_time": "20:00:00",
      "images": ["https://example.com/test-branch.jpg"],
      "amenities": ["wifi", "coffee"]
    }' "$SUPER_ADMIN_TOKEN" "Create Branch")
    
    # Extract branch ID for seat creation
    branch_id=$(echo "$branch_response" | jq -r '.data.id // 1')
    
    # 22. Create Seat
    call_api "POST" "/api/admin/seats" "{
      \"name\": \"Test Seat\",
      \"code\": \"TESTST-101\",
      \"seating_type_id\": $seating_type_id,
      \"branch_id\": $branch_id,
      \"price_multiplier\": 1.0,
      \"status\": \"AVAILABLE\",
      \"features\": [\"test-feature\"],
      \"floor\": 1,
      \"position_x\": 1.0,
      \"position_y\": 1.0
    }" "$SUPER_ADMIN_TOKEN" "Create Seat"
    
    # 23. Create Admin
    call_api "POST" "/api/admin/super/admins" "{
      \"username\": \"testadmin\",
      \"email\": \"testadmin@example.com\",
      \"password\": \"Admin@123\",
      \"name\": \"Test Admin\",
      \"role\": \"branch_admin\",
      \"branch_id\": $branch_id,
      \"permissions\": {
        \"seats\": [\"read\", \"update\"],
        \"bookings\": [\"read\", \"create\", \"update\"],
        \"customers\": [\"read\"],
        \"support\": [\"read\", \"create\", \"update\"]
      }
    }" "$SUPER_ADMIN_TOKEN" "Create Admin"
else
    echo -e "${RED}Skipping super admin endpoint tests due to missing token${NC}\n"
fi

echo -e "${BLUE}TESTING LOGOUT ENDPOINTS${NC}\n"

# 24. User Logout
if [ ! -z "$USER_TOKEN" ]; then
    call_api "POST" "/api/auth/logout" "" "$USER_TOKEN" "User Logout"
fi

# 25. Admin Logout
if [ ! -z "$ADMIN_TOKEN" ]; then
    call_api "POST" "/api/admin/auth/logout" "" "$ADMIN_TOKEN" "Admin Logout"
fi

echo -e "${BLUE}==========================================${NC}"
echo -e "${BLUE}API Testing Complete${NC}"
echo -e "${BLUE}==========================================${NC}" 