# Branch & Seat Code Migration Summary

This document outlines the changes made to implement branch and seat codes in the API, allowing for more user-friendly identifiers throughout the system.

## Overview of Changes

1. **Model Updates**:
   - Added `short_code` field to the Branch model
   - Added `short_code` field to the SeatingType model
   - Added `seat_code` field to the Seat model
   - Implemented automatic generation of these codes when records are created

2. **API Endpoint Updates**:
   - Updated branch endpoints to support lookup by branch code
   - Updated seat endpoints to support lookup by seat code
   - Added new endpoints to get seats by branch code
   - Enhanced response formats to include seat counts and organize by seating type
   - Updated bookings endpoint to filter by booking status and validate branch/seating type existence

3. **Database Migrations**:
   - Added migration scripts for adding all necessary columns

## Migration Steps

To apply these changes to your environment, follow these steps:

1. **Run Database Migrations**:
   ```
   npm run migrate:branch-short-code
   npm run migrate:branch-images
   npm run migrate:branch-amenities
   npm run migrate:seat-code
   ```

2. **Test Endpoints**:
   - Test the `/api/branches` endpoint to confirm branches now include short codes
   - Test the `/api/branches/[code]` endpoint to confirm branches can be looked up by code
   - Test the `/api/branches/[code]/seats` endpoint to confirm seats are organized by seating type

## Key API Changes

### Branch Endpoints

- **GET /api/branches**
  - Now returns branches with `short_code`
  - Seats are organized by seating type
  - Includes total seat count and per-seating-type counts
  - Supports filtering by `seating_type_code` (in addition to `seating_type_id`)

- **GET /api/branches/[id]**
  - Now accepts either branch ID or branch code
  - Returns branch with `short_code` and total seat count

- **GET /api/branches/[id]/seats**
  - Access seats for a branch using either ID or branch code
  - Filter by `seating_type_id` or `seating_type_code`
  - Seats are organized by seating type

### Seat Endpoints

- **GET /api/seat/[id]**
  - Now accepts either seat ID or seat code
  - Returns seat with branch and seating type information

### Booking Endpoints

- **GET /api/bookings**
  - Supports filtering by `branch` (branch code)
  - Supports filtering by `type` (seating type code)
  - Supports filtering by `status` (active, upcoming, cancelled, completed)
  - Validates that branches and seating types exist before querying
  - Returns additional booking status fields:
    - `is_active` - Currently ongoing booking
    - `is_upcoming` - Future confirmed booking
    - `is_completed` - Past booking
    - `is_cancelled` - Cancelled booking
  - Automatically calculates booking status based on date/time
  - Returns seat codes and seating type codes in response

## Response Format Examples

### Branch with Seats Example:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Downtown Branch",
    "address": "123 Main St",
    "location": "Downtown",
    "short_code": "DOW123",
    "seating_types": [
      {
        "id": 1,
        "name": "Hot Desk",
        "short_code": "HD",
        "description": "Flexible seating",
        "hourly_rate": 10,
        "is_hourly": true,
        "min_booking_duration": 1,
        "min_seats": 1,
        "seats": [
          {
            "id": 1,
            "seat_code": "HD001",
            "seat_number": "A1",
            "price": 10,
            "availability_status": "available"
          }
        ],
        "seat_count": 1
      }
    ],
    "total_seats": 1
  }
}
```

### Seat Response Example:

```json
{
  "success": true,
  "data": {
    "seat": {
      "id": 1,
      "branch_id": 1,
      "seating_type_id": 1,
      "seat_number": "A1",
      "seat_code": "HD001",
      "price": 10,
      "availability_status": "available",
      "Branch": {
        "id": 1,
        "name": "Downtown Branch",
        "short_code": "DOW123"
      },
      "SeatingType": {
        "id": 1,
        "name": "Hot Desk",
        "short_code": "HD"
      }
    },
    "bookings": []
  }
}
```

### Booking Response Example:

```json
{
  "success": true,
  "message": "Bookings fetched successfully",
  "data": [
    {
      "id": 1,
      "type": "seat",
      "customer_id": 101,
      "seat_id": 201,
      "start_time": "2023-06-15T09:00:00Z",
      "end_time": "2023-06-15T17:00:00Z",
      "total_price": 80.00,
      "status": "COMPLETED",
      "booking_status": "CONFIRMED",
      "is_active": false,
      "is_upcoming": false,
      "is_completed": true,
      "is_cancelled": false,
      "seat": {
        "id": 201,
        "seat_number": "A1",
        "seat_code": "HD001"
      },
      "meeting_room": null,
      "seating_type": {
        "id": 1,
        "name": "HOT_DESK",
        "short_code": "HD",
        "description": "Flexible workspace",
        "hourly_rate": 10.00,
        "is_hourly": true,
        "min_booking_duration": 1,
        "min_seats": 1
      },
      "branch": {
        "id": 5,
        "name": "Downtown Branch",
        "short_code": "DOW123",
        "address": "123 Main St",
        "location": "Downtown"
      },
      "customer": {
        "id": 101,
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "555-123-4567",
        "company_name": "ACME Inc"
      }
    }
  ]
}
```

## Filtering Bookings by Status

You can filter bookings by status using the `status` query parameter:

- **active**: Currently ongoing bookings
- **upcoming**: Future confirmed bookings
- **cancelled**: All cancelled bookings
- **completed**: Past bookings (either explicitly marked as completed or past their end time)

Example: `/api/bookings?status=active&branch=DOW123&type=HD`

## Troubleshooting

If you encounter any issues:

1. Verify all migrations ran successfully
2. Check that your environment has the necessary database schema
3. Ensure branch and seating type records have valid short codes
4. For any records missing codes, you can run the migration scripts again

For additional assistance, refer to the codebase documentation or contact the development team. 