## Razorpay Payment Integration

We've integrated Razorpay for payment processing with the following features:

1. **Payment Processing**: Implemented Razorpay SDK for secure payment processing.
2. **Payment Logging**: Created a comprehensive payment log system to track all transactions.
3. **Order Management**: Added functionality to create, verify, and capture payments using Razorpay's APIs.
4. **Refund Handling**: Implemented refund processing for cancelled bookings.

### Payment Endpoints

#### Create Payment Order
- **POST /api/payments/create-order**
  - Creates a new payment order in Razorpay
  - Required fields: `amount`, `booking_id`, `booking_type`
  - Returns Razorpay order details for client-side payment processing

#### Verify Payment
- **POST /api/payments/verify**
  - Verifies payment signature from Razorpay
  - Required fields: `order_id`, `payment_id`, `signature`
  - Updates booking status upon successful verification

#### Payment Status
- **GET /api/payments/:payment_id**
  - Retrieves payment status and details
  - Requires authentication
  - Returns payment details, including status and transaction logs

### Payment Logs

A new `payment_logs` table has been created to track all payment transactions with the following fields:

- `booking_id`: Links to the booking (seat or meeting)
- `booking_type`: Type of booking ('seat' or 'meeting')
- `payment_id`: Razorpay payment ID
- `order_id`: Razorpay order ID
- `transaction_id`: Unique transaction ID
- `amount`: Transaction amount
- `status`: Payment status ('created', 'authorized', 'captured', 'refunded', 'failed')
- `payment_method`: Method used for payment
- `refund_id`: Razorpay refund ID (if applicable)
- `refund_amount`: Amount refunded (if applicable)
- `notes`: Additional notes about the transaction
- `metadata`: Additional metadata about the transaction

## Admin Dashboard

We've implemented a comprehensive admin system with role-based access control:

1. **Super Admin**: Has access to all branches and can manage settings globally
2. **Branch Admin**: Restricted to managing specific branch operations

### Admin Users

The admin system includes:

- Secure authentication with JWT
- Role-based authorization
- Profile management

### Admin Endpoints

#### Authentication
- **POST /api/admin/auth/login**
  - Authenticates admin users
  - Required fields: `username` (or email) and `password`
  - Returns JWT token and admin profile information

#### Admin Profile
- **GET /api/admin/profile**
  - Retrieves admin profile information
  - Requires admin authentication
  - Returns admin details including role and associated branch (if applicable)

- **PUT /api/admin/profile/update**
  - Updates admin profile information
  - Supports updating name, email, username, password, and profile picture
  - Validates password changes with current password

#### Branch Management
- **GET /api/admin/branches**
  - Lists branches with pagination and filtering
  - Super admin sees all branches, branch admin sees only their branch
  - Supports search, status filtering, and pagination

- **POST /api/admin/branches**
  - Creates a new branch (super admin only)
  - Required fields: `name`, `location`, `short_code`
  - Optional fields: `description`, `contact_email`, `contact_phone`, `is_active`

#### Seating Management
- **GET /api/admin/branches/:branch_id/seats**
  - Lists all seats in a branch with filtering options
  - Requires branch access authorization
  - Supports filtering by seating type, status, and availability

- **POST /api/admin/branches/:branch_id/seats**
  - Creates new seats in a branch
  - Required fields: `seat_code`, `seating_type_id`
  - Optional fields: `status`, `capacity`, `description`

#### Booking Management
- **GET /api/admin/bookings**
  - Lists all bookings with filtering options
  - Super admin sees all bookings, branch admin sees only their branch's bookings
  - Supports filtering by date range, status, and booking type

- **PUT /api/admin/bookings/:booking_id**
  - Updates booking status (e.g., confirm, cancel)
  - Requires appropriate authorization
  - Triggers payment processing or refund based on status change

### Admin User Types

1. **Super Admin**
   - Full access to all branches, seats, and bookings
   - Can create/update branches and seating types
   - Can manage other admin users
   - Can view global statistics and reports

2. **Branch Admin**
   - Access limited to assigned branch
   - Can manage seats and bookings for their branch
   - Can view branch-specific statistics and reports
   - Cannot create new branches or modify global settings 