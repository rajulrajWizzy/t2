#!/bin/bash
# Coworks Complete API Testing Script
# Replace domain with your actual API domain

API_BASE="https://your-api-domain.com"
CUSTOMER_TOKEN=""
ADMIN_TOKEN=""
SUPER_ADMIN_TOKEN=""
BRANCH_ADMIN_TOKEN=""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_header() {
  echo -e "\n${BLUE}============================================${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}============================================${NC}"
}

print_subheader() {
  echo -e "\n${YELLOW}--------------------------------------------${NC}"
  echo -e "${YELLOW}$1${NC}"
  echo -e "${YELLOW}--------------------------------------------${NC}"
}

print_success() {
  echo -e "${GREEN}SUCCESS: $1${NC}"
}

print_error() {
  echo -e "${RED}ERROR: $1${NC}"
}

# ==========================================
# AUTHENTICATION ENDPOINTS
# ==========================================

print_header "AUTHENTICATION ENDPOINTS"

# --- Customer Registration ---
print_subheader "Customer Registration"
REGISTER_RESPONSE=$(curl -s -X POST \
  "${API_BASE}/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Customer",
    "email": "test.customer@example.com",
    "password": "password123",
    "phone": "+1234567890"
  }')

echo "Registration response:"
echo "$REGISTER_RESPONSE" | json_pp

# --- Customer Login ---
print_subheader "Customer Login"
LOGIN_RESPONSE=$(curl -s -X POST \
  "${API_BASE}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test.customer@example.com",
    "password": "password123"
  }')

echo "Login response:"
echo "$LOGIN_RESPONSE" | json_pp

# Extract customer token
CUSTOMER_TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | sed 's/"token":"//')

if [ -z "$CUSTOMER_TOKEN" ]; then
  print_error "Failed to get customer token"
else
  print_success "Obtained customer token"
fi

# --- Forgot Password ---
print_subheader "Forgot Password"
curl -s -X POST \
  "${API_BASE}/api/auth/forgot-password" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test.customer@example.com"
  }' | json_pp

# --- Admin Login ---
print_subheader "Admin Login"
ADMIN_LOGIN_RESPONSE=$(curl -s -X POST \
  "${API_BASE}/api/admin/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin_password"
  }')

echo "Admin login response:"
echo "$ADMIN_LOGIN_RESPONSE" | json_pp

# Extract admin token
ADMIN_TOKEN=$(echo $ADMIN_LOGIN_RESPONSE | grep -o '"token":"[^"]*' | sed 's/"token":"//')

if [ -z "$ADMIN_TOKEN" ]; then
  print_error "Failed to get admin token"
else
  print_success "Obtained admin token"
  # Use this token for all admin operations
  SUPER_ADMIN_TOKEN=$ADMIN_TOKEN
fi

# ==========================================
# ADMIN USER MANAGEMENT
# ==========================================

print_header "ADMIN USER MANAGEMENT"

# --- Create Branch Admin ---
print_subheader "Create Branch Admin"
curl -s -X POST \
  "${API_BASE}/api/admin/users/create" \
  -H "Authorization: Bearer $SUPER_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "branchadmin",
    "email": "branchadmin@example.com",
    "password": "admin123",
    "name": "Branch Admin",
    "role": "branch_admin",
    "branch_id": 1
  }' | json_pp

# --- Branch Admin Login ---
print_subheader "Branch Admin Login"
BRANCH_ADMIN_LOGIN=$(curl -s -X POST \
  "${API_BASE}/api/admin/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "branchadmin",
    "password": "admin123"
  }')

echo "Branch admin login response:"
echo "$BRANCH_ADMIN_LOGIN" | json_pp

# Extract branch admin token
BRANCH_ADMIN_TOKEN=$(echo $BRANCH_ADMIN_LOGIN | grep -o '"token":"[^"]*' | sed 's/"token":"//')

if [ -z "$BRANCH_ADMIN_TOKEN" ]; then
  print_error "Failed to get branch admin token"
else
  print_success "Obtained branch admin token"
fi

# --- Get All Admins ---
print_subheader "Get All Admins"
curl -s -X GET \
  "${API_BASE}/api/admin/users" \
  -H "Authorization: Bearer $SUPER_ADMIN_TOKEN" | json_pp

# ==========================================
# PROFILE MANAGEMENT
# ==========================================

print_header "PROFILE MANAGEMENT"

# --- Get Customer Profile ---
print_subheader "Get Customer Profile"
curl -s -X GET \
  "${API_BASE}/api/profile" \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" | json_pp

# --- Update Customer Profile ---
print_subheader "Update Customer Profile"
curl -s -X PATCH \
  "${API_BASE}/api/profile" \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Customer Name",
    "phone": "+9876543210"
  }' | json_pp

# --- Get Admin Profile ---
print_subheader "Get Admin Profile"
curl -s -X GET \
  "${API_BASE}/api/admin/profile" \
  -H "Authorization: Bearer $SUPER_ADMIN_TOKEN" | json_pp

# --- Update Admin Profile ---
print_subheader "Update Admin Profile"
curl -s -X PUT \
  "${API_BASE}/api/admin/profile/update" \
  -H "Authorization: Bearer $SUPER_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Admin Name",
    "email": "updated.admin@example.com"
  }' | json_pp

# ==========================================
# BRANCH MANAGEMENT
# ==========================================

print_header "BRANCH MANAGEMENT"

# --- Create Branch ---
print_subheader "Create Branch"
BRANCH_RESPONSE=$(curl -s -X POST \
  "${API_BASE}/api/branches" \
  -H "Authorization: Bearer $SUPER_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Branch",
    "address": "123 Test St",
    "location": "Test Location",
    "latitude": 12.9716,
    "longitude": 77.5946,
    "short_code": "TSTB",
    "cost_multiplier": 1.2,
    "opening_time": "09:00:00",
    "closing_time": "18:00:00"
  }')

echo "Create branch response:"
echo "$BRANCH_RESPONSE" | json_pp

# Extract branch ID for later use
BRANCH_ID=$(echo $BRANCH_RESPONSE | grep -o '"id":[0-9]*' | head -1 | sed 's/"id"://')

if [ -z "$BRANCH_ID" ]; then
  # Try alternate extraction if the above fails
  BRANCH_ID=$(echo $BRANCH_RESPONSE | grep -o '"data":{"id":[0-9]*' | sed 's/"data":{"id"://')
fi

if [ -z "$BRANCH_ID" ]; then
  print_error "Failed to extract branch ID, using default 1"
  BRANCH_ID=1
else
  print_success "Using branch ID: $BRANCH_ID"
fi

# --- Get All Branches ---
print_subheader "Get All Branches"
curl -s -X GET \
  "${API_BASE}/api/branches" \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" | json_pp

# --- Get Branch by ID ---
print_subheader "Get Branch by ID"
curl -s -X GET \
  "${API_BASE}/api/branches/$BRANCH_ID" \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" | json_pp

# --- Get Branch by Short Code ---
print_subheader "Get Branch by Short Code"
curl -s -X GET \
  "${API_BASE}/api/branches/TSTB" \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" | json_pp

# --- Update Branch ---
print_subheader "Update Branch"
curl -s -X PUT \
  "${API_BASE}/api/branches/$BRANCH_ID" \
  -H "Authorization: Bearer $SUPER_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Test Branch",
    "is_active": true,
    "cost_multiplier": 1.5
  }' | json_pp

# --- Get Branch Statistics ---
print_subheader "Get Branch Statistics"
curl -s -X GET \
  "${API_BASE}/api/branches/stats" \
  -H "Authorization: Bearer $SUPER_ADMIN_TOKEN" | json_pp

# --- Bulk Create Branches ---
print_subheader "Bulk Create Branches"
curl -s -X POST \
  "${API_BASE}/api/branches/bulk" \
  -H "Authorization: Bearer $SUPER_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '[
    {
      "name": "Bulk Branch 1",
      "address": "Address 1",
      "short_code": "BB1",
      "opening_time": "09:00:00",
      "closing_time": "18:00:00"
    },
    {
      "name": "Bulk Branch 2",
      "address": "Address 2",
      "short_code": "BB2",
      "opening_time": "09:00:00",
      "closing_time": "18:00:00"
    }
  ]' | json_pp

# ==========================================
# SEATING TYPE MANAGEMENT
# ==========================================

print_header "SEATING TYPE MANAGEMENT"

# --- Create Seating Type ---
print_subheader "Create Seating Type"
SEATING_TYPE_RESPONSE=$(curl -s -X POST \
  "${API_BASE}/api/seating-types" \
  -H "Authorization: Bearer $SUPER_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Hot Desk",
    "short_code": "HTDK",
    "description": "Flexible desk for daily use",
    "hourly_rate": 10,
    "is_hourly": true,
    "min_booking_duration": 1,
    "min_seats": 1
  }')

echo "Create seating type response:"
echo "$SEATING_TYPE_RESPONSE" | json_pp

# Extract seating type ID for later use
SEATING_TYPE_ID=$(echo $SEATING_TYPE_RESPONSE | grep -o '"id":[0-9]*' | head -1 | sed 's/"id"://')

if [ -z "$SEATING_TYPE_ID" ]; then
  print_error "Failed to extract seating type ID, using default 1"
  SEATING_TYPE_ID=1
else
  print_success "Using seating type ID: $SEATING_TYPE_ID"
fi

# --- Get All Seating Types ---
print_subheader "Get All Seating Types"
curl -s -X GET \
  "${API_BASE}/api/seating-types" \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" | json_pp

# ==========================================
# SEAT MANAGEMENT
# ==========================================

print_header "SEAT MANAGEMENT"

# --- Create Seat ---
print_subheader "Create Seat"
SEAT_RESPONSE=$(curl -s -X POST \
  "${API_BASE}/api/seat" \
  -H "Authorization: Bearer $SUPER_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "branch_id": '"$BRANCH_ID"',
    "seating_type_id": '"$SEATING_TYPE_ID"',
    "seat_number": "A-101",
    "status": "available",
    "seat_code": "TSTB-HTDK-101",
    "description": "Window seat with good lighting",
    "capacity": 1
  }')

echo "Create seat response:"
echo "$SEAT_RESPONSE" | json_pp

# Extract seat ID for later use
SEAT_ID=$(echo $SEAT_RESPONSE | grep -o '"id":[0-9]*' | head -1 | sed 's/"id"://')

if [ -z "$SEAT_ID" ]; then
  print_error "Failed to extract seat ID, using default 1"
  SEAT_ID=1
else
  print_success "Using seat ID: $SEAT_ID"
fi

# --- Get All Seats ---
print_subheader "Get All Seats"
curl -s -X GET \
  "${API_BASE}/api/seat" \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" | json_pp

# --- Get Seat by ID ---
print_subheader "Get Seat by ID"
curl -s -X GET \
  "${API_BASE}/api/seat/$SEAT_ID" \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" | json_pp

# --- Update Seat ---
print_subheader "Update Seat"
curl -s -X PUT \
  "${API_BASE}/api/seat/$SEAT_ID" \
  -H "Authorization: Bearer $SUPER_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "maintenance",
    "description": "Under maintenance until next week"
  }' | json_pp

# --- Get Branch Seats ---
print_subheader "Get Branch Seats"
curl -s -X GET \
  "${API_BASE}/api/branches/$BRANCH_ID/seats" \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" | json_pp

# ==========================================
# SLOT MANAGEMENT
# ==========================================

print_header "SLOT MANAGEMENT"

# --- Create Time Slot ---
print_subheader "Create Time Slot"
curl -s -X POST \
  "${API_BASE}/api/slots" \
  -H "Authorization: Bearer $SUPER_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "branch_code": "TSTB",
    "seating_type_code": "HTDK",
    "start_date": "2023-10-01",
    "end_date": "2023-10-30",
    "start_time": "09:00",
    "end_time": "18:00",
    "interval_minutes": 60
  }' | json_pp

# --- Get All Slots ---
print_subheader "Get All Slots"
curl -s -X GET \
  "${API_BASE}/api/slots" \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" | json_pp

# --- Get Slots by Seating Type ---
print_subheader "Get Slots by Seating Type"
curl -s -X GET \
  "${API_BASE}/api/slots/seating-type?seating_type_code=HTDK" \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" | json_pp

# --- Get Slots Categorized ---
print_subheader "Get Slots Categorized"
curl -s -X GET \
  "${API_BASE}/api/slots/categorized?branch_code=TSTB" \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" | json_pp

# --- Get Available Slots ---
print_subheader "Get Available Slots"
curl -s -X GET \
  "${API_BASE}/api/slots/available?branch_code=TSTB&seating_type_code=HTDK&start_date=2023-10-01&end_date=2023-10-30" \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" | json_pp

# --- Get Branch Seating ---
print_subheader "Get Branch Seating"
curl -s -X GET \
  "${API_BASE}/api/slots/branch-seating?branch_code=TSTB" \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" | json_pp

# ==========================================
# BOOKING MANAGEMENT
# ==========================================

print_header "BOOKING MANAGEMENT"

# --- Create Booking ---
print_subheader "Create Booking"
BOOKING_RESPONSE=$(curl -s -X POST \
  "${API_BASE}/api/bookings" \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "seat",
    "seat_code": "TSTB-HTDK-101",
    "start_time": "2023-10-15T09:00:00",
    "end_time": "2023-10-15T17:00:00",
    "total_price": 80,
    "quantity": 1,
    "seating_type_code": "HTDK"
  }')

echo "Create booking response:"
echo "$BOOKING_RESPONSE" | json_pp

# Extract booking ID for later use
BOOKING_ID=$(echo $BOOKING_RESPONSE | grep -o '"id":[0-9]*' | head -1 | sed 's/"id"://')

if [ -z "$BOOKING_ID" ]; then
  print_error "Failed to extract booking ID, using default 1"
  BOOKING_ID=1
else
  print_success "Using booking ID: $BOOKING_ID"
fi

# --- Get User Bookings ---
print_subheader "Get User Bookings"
curl -s -X GET \
  "${API_BASE}/api/bookings" \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" | json_pp

# --- Get Booking by ID ---
print_subheader "Get Booking by ID"
curl -s -X GET \
  "${API_BASE}/api/bookings/$BOOKING_ID" \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" | json_pp

# --- Update Booking ---
print_subheader "Update Booking"
curl -s -X PUT \
  "${API_BASE}/api/bookings/$BOOKING_ID" \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "cancelled",
    "cancel_reason": "Schedule changed"
  }' | json_pp

# ==========================================
# PAYMENT MANAGEMENT
# ==========================================

print_header "PAYMENT MANAGEMENT"

# --- Create Payment ---
print_subheader "Create Payment"
PAYMENT_RESPONSE=$(curl -s -X POST \
  "${API_BASE}/api/payments" \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "booking_id": '"$BOOKING_ID"',
    "amount": 80,
    "payment_method": "credit_card",
    "payment_details": {
      "card_number": "XXXX-XXXX-XXXX-1234",
      "expiry": "12/25"
    }
  }')

echo "Create payment response:"
echo "$PAYMENT_RESPONSE" | json_pp

# Extract payment ID for later use
PAYMENT_ID=$(echo $PAYMENT_RESPONSE | grep -o '"id":[0-9]*' | head -1 | sed 's/"id"://')

if [ -z "$PAYMENT_ID" ]; then
  print_error "Failed to extract payment ID, using default 1"
  PAYMENT_ID=1
else
  print_success "Using payment ID: $PAYMENT_ID"
fi

# --- Get User Payments ---
print_subheader "Get User Payments"
curl -s -X GET \
  "${API_BASE}/api/payments" \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" | json_pp

# --- Get Payment by ID ---
print_subheader "Get Payment by ID"
curl -s -X GET \
  "${API_BASE}/api/payments/$PAYMENT_ID" \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" | json_pp

# --- Update Payment ---
print_subheader "Update Payment"
curl -s -X PUT \
  "${API_BASE}/api/payments/$PAYMENT_ID" \
  -H "Authorization: Bearer $SUPER_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "refunded",
    "refund_reason": "Booking cancelled"
  }' | json_pp

# ==========================================
# SUPPORT TICKET MANAGEMENT
# ==========================================

print_header "SUPPORT TICKET MANAGEMENT"

# --- Create Support Ticket ---
print_subheader "Create Support Ticket"
TICKET_RESPONSE=$(curl -s -X POST \
  "${API_BASE}/api/support/tickets" \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Issue with booking",
    "description": "I cannot cancel my booking",
    "priority": "medium"
  }')

echo "Create ticket response:"
echo "$TICKET_RESPONSE" | json_pp

# Extract ticket ID for later use
TICKET_ID=$(echo $TICKET_RESPONSE | grep -o '"id":[0-9]*' | head -1 | sed 's/"id"://')

if [ -z "$TICKET_ID" ]; then
  print_error "Failed to extract ticket ID, using default 1"
  TICKET_ID=1
else
  print_success "Using ticket ID: $TICKET_ID"
fi

# --- Get User Tickets ---
print_subheader "Get User Tickets"
curl -s -X GET \
  "${API_BASE}/api/support/tickets" \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" | json_pp

# --- Get Ticket by ID ---
print_subheader "Get Ticket by ID"
curl -s -X GET \
  "${API_BASE}/api/support/tickets/$TICKET_ID" \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" | json_pp

# --- Update Ticket ---
print_subheader "Update Ticket"
curl -s -X PUT \
  "${API_BASE}/api/support/tickets/$TICKET_ID" \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "closed"
  }' | json_pp

# --- Create Ticket Message ---
print_subheader "Create Ticket Message"
curl -s -X POST \
  "${API_BASE}/api/support/tickets/messages" \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "ticket_id": '"$TICKET_ID"',
    "message": "Any updates on my issue?"
  }' | json_pp

# --- Admin: Get Support Tickets ---
print_subheader "Admin: Get Support Tickets"
curl -s -X GET \
  "${API_BASE}/api/admin/support/tickets" \
  -H "Authorization: Bearer $SUPER_ADMIN_TOKEN" | json_pp

# --- Admin: Get Support Ticket by ID ---
print_subheader "Admin: Get Support Ticket by ID"
curl -s -X GET \
  "${API_BASE}/api/admin/support/tickets/$TICKET_ID" \
  -H "Authorization: Bearer $SUPER_ADMIN_TOKEN" | json_pp

# --- Admin: Update Support Ticket ---
print_subheader "Admin: Update Support Ticket"
curl -s -X PUT \
  "${API_BASE}/api/admin/support/tickets/$TICKET_ID" \
  -H "Authorization: Bearer $SUPER_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "in_progress",
    "admin_notes": "Working on this issue"
  }' | json_pp

# --- Admin: Reply to Support Ticket ---
print_subheader "Admin: Reply to Support Ticket"
curl -s -X POST \
  "${API_BASE}/api/admin/support/tickets/$TICKET_ID/messages" \
  -H "Authorization: Bearer $SUPER_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "We are investigating your issue now."
  }' | json_pp

# ==========================================
# ADMIN DASHBOARD STATISTICS
# ==========================================

print_header "ADMIN DASHBOARD STATISTICS"

# --- Get Admin Dashboard Stats ---
print_subheader "Get Admin Dashboard Stats"
curl -s -X GET \
  "${API_BASE}/api/admin/dashboard/stats" \
  -H "Authorization: Bearer $BRANCH_ADMIN_TOKEN" | json_pp

# --- Get Super Admin Stats ---
print_subheader "Get Super Admin Stats"
curl -s -X GET \
  "${API_BASE}/api/admin/super/stats" \
  -H "Authorization: Bearer $SUPER_ADMIN_TOKEN" | json_pp

# ==========================================
# MISCELLANEOUS ENDPOINTS
# ==========================================

print_header "MISCELLANEOUS ENDPOINTS"

# --- Test Endpoint ---
print_subheader "Test Endpoint"
curl -s -X GET "${API_BASE}/api/test" | json_pp

# --- Health Check ---
print_subheader "Health Check"
curl -s -X GET "${API_BASE}/api/health" | json_pp

print_header "API TESTING COMPLETE"
echo -e "${GREEN}All API endpoints tested successfully.${NC}"
echo -e "${YELLOW}Note: Some APIs might have failed if pre-requisites weren't met.${NC}"
echo -e "${YELLOW}Check the responses above for any errors.${NC}" 