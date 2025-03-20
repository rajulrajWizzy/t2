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
   - Added new slots API to support different seating types with date ranges

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
   - Test the `/api/slots/available` endpoint to confirm available slots are returned for different seating types

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

### Slot Endpoints

- **GET /api/slots/available**
  - New endpoint to get available slots for booking
  - Takes `branch_code` and `seating_type_code` parameters
  - For non-hourly bookings (Hot Desk, Dedicated Desk, Cubicle, Daily Pass):
    - Accepts `start_date` and optional `end_date`
    - Auto-calculates end date based on minimum booking duration
    - Returns available seats and booking requirements
  - For hourly bookings (Meeting Room):
    - Accepts `start_date`, `start_time`, and `end_time`
    - Returns available time slots
  - Provides seat counts and estimated pricing
  - Includes booking requirements specific to each seating type

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

- **POST /api/bookings**
  - Updated minimum requirements for different seating types:
    - Hot Desk: 1 month minimum, at least 1 seat
    - Dedicated Desk: 1 month minimum, at least 1 seat
    - Cubicle: 1 month minimum
    - Meeting Room: 1 hour minimum
    - Daily Pass: 1 day minimum
  - Now accepts `seat_code` as an alternative to `seat_id`
  - Supports `seating_type_code` to validate the seat type
  - Returns more detailed booking information including branch, duration, and price

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

### Available Slots Response Example:

```json
{
  "success": true,
  "data": {
    "branch": {
      "id": 1,
      "name": "Downtown Branch",
      "short_code": "DOW123",
      "location": "Downtown",
      "address": "123 Main St",
      "opening_time": "08:00:00",
      "closing_time": "18:00:00"
    },
    "seating_type": {
      "id": 1,
      "name": "HOT_DESK",
      "short_code": "HD",
      "description": "Flexible workspace",
      "hourly_rate": 10,
      "is_hourly": false,
      "min_booking_duration": 1,
      "min_seats": 1
    },
    "start_date": "2023-06-15",
    "end_date": "2023-07-15",
    "available_seats": [
      {
        "id": 1,
        "seat_number": "A1",
        "seat_code": "HD001",
        "price": 10
      },
      {
        "id": 2,
        "seat_number": "A2",
        "seat_code": "HD002",
        "price": 10
      }
    ],
    "seat_count": 2,
    "booking_requirements": {
      "min_duration": 1,
      "min_seats": 1,
      "duration_unit": "months",
      "is_hourly": false
    },
    "booking_info": {
      "type": "HOT_DESK",
      "message": "Hot desk booking requires a minimum duration of 1 month",
      "can_book_multiple": true
    },
    "pricing": {
      "base_rate": 10,
      "rate_unit": "per day",
      "estimated_total": 7200
    }
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

### Booking Creation Response Example:

```json
{
  "success": true,
  "message": "HOT_DESK booking created successfully",
  "data": {
    "bookings": [
      {
        "id": 1,
        "start_time": "2023-06-15T09:00:00Z",
        "end_time": "2023-07-15T09:00:00Z",
        "total_price": 720.00,
        "status": "CONFIRMED",
        "seat_id": 1
      }
    ],
    "seat": {
      "id": 1,
      "seat_number": "A1",
      "seat_code": "HD001"
    },
    "seating_type": {
      "id": 1,
      "name": "HOT_DESK",
      "short_code": "HD",
      "description": "Flexible workspace"
    },
    "branch": {
      "id": 1,
      "name": "Downtown Branch",
      "short_code": "DOW123",
      "location": "Downtown",
      "address": "123 Main St"
    },
    "booking_details": {
      "type": "seat",
      "quantity": 1,
      "start_time": "2023-06-15T09:00:00Z",
      "end_time": "2023-07-15T09:00:00Z",
      "duration": {
        "hours": 720,
        "days": 30,
        "months": 1
      },
      "total_price": 720.00
    }
  }
}
```

## Filtering Bookings by Status

You can filter bookings by status using the `status` query parameter:

- **active**: Currently ongoing bookings
- **upcoming**: Future confirmed bookings
- **cancelled**: All cancelled bookings
- **completed**: Past bookings (either explicitly marked as completed or past their end time)

Example: `/api/bookings?status=active&branch=DOW123&type=HD`

## Booking Different Seating Types

For booking different seating types, use the following requirements:

1. **Hot Desk** (short_code: HD)
   - Minimum duration: 1 month
   - Minimum seats: 1
   - Example: `/api/slots/available?branch_code=DOW123&seating_type_code=HD&start_date=2023-06-15`

2. **Dedicated Desk** (short_code: DD)
   - Minimum duration: 1 month
   - Minimum seats: 1
   - Example: `/api/slots/available?branch_code=DOW123&seating_type_code=DD&start_date=2023-06-15`

3. **Cubicle** (short_code: CB)
   - Minimum duration: 1 month
   - Example: `/api/slots/available?branch_code=DOW123&seating_type_code=CB&start_date=2023-06-15`

4. **Meeting Room** (short_code: MR)
   - Hourly booking
   - Minimum duration: 1 hour
   - Example: `/api/slots/available?branch_code=DOW123&seating_type_code=MR&start_date=2023-06-15&start_time=09:00&end_time=11:00`

5. **Daily Pass** (short_code: DP)
   - Minimum duration: 1 day
   - Example: `/api/slots/available?branch_code=DOW123&seating_type_code=DP&start_date=2023-06-15`

## Troubleshooting

If you encounter any issues:

1. Verify all migrations ran successfully
2. Check that your environment has the necessary database schema
3. Ensure branch and seating type records have valid short codes
4. For any records missing codes, you can run the migration scripts again

For additional assistance, refer to the codebase documentation or contact the development team. 