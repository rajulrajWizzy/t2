# Branch & Seat Code Migration Summary

This document outlines the changes made to implement branch and seat codes in the API, along with additional enhancements for profile pictures, branch images, amenities, validation, and more.

## Overview of Changes

1. **Model Updates**:
   - Added `short_code` field to the Branch model (3-letter unique identifier)
   - Added `short_code` field to the SeatingType model (3-letter unique identifier)
   - Added `seat_code` field to the Seat model (format: [seating type code][3-digit sequence])
   - Added `profile_picture` field to Users and Customers
   - Added support for branch images based on seating types
   - Added support for branch amenities

2. **API Endpoint Updates**:
   - Updated branch endpoints to support lookup by branch code
   - Updated seat endpoints to support lookup by seat code
   - Added new endpoints to get seats by branch code
   - Enhanced response formats to include seat counts and organize by seating type
   - Updated bookings endpoint to filter by booking status and validate branch/seating type existence
   - Added new slots API to support different seating types with date ranges
   - Added branch stats API to show detailed seat counts and availability by branch and seating type

3. **Database Migrations**:
   - Added migration scripts for adding all necessary columns
   - Implemented validation for short codes (3-letter format)
   - Added profile pictures for users
   - Added images for branches based on their seating types
   - Added amenities for branches

4. **Data Validation**:
   - Added middleware to validate request parameters and payload
   - Implemented validation for short codes, seat codes, dates, and times
   - Enhanced JWT validation for authentication

## Migration Steps

To apply these changes to your environment, follow these steps:

1. **Run Database Migrations**:
   ```
   npm run migrate:short-codes
   npm run migrate:branch-images
   npm run migrate:branch-amenities
   npm run migrate:seat-code
   npm run migrate:user-profiles
   ```

2. **Test Endpoints**:
   - Test the `/api/branches` endpoint to confirm branches now include short codes
   - Test the `/api/branches/[code]` endpoint to confirm branches can be looked up by code
   - Test the `/api/branches/[code]/seats` endpoint to confirm seats are organized by seating type
   - Test the `/api/slots/available` endpoint to confirm available slots are returned for different seating types
   - Test the `/api/branches/stats` endpoint to verify accurate seat counts and availability

## Key API Changes

### Branch Endpoints

- **GET /api/branches**
  - Now returns branches with `short_code`
  - Seats are organized by seating type
  - Includes total seat count and per-seating-type counts
  - Supports filtering by `seating_type_code` (in addition to `seating_type_id`)
  - Branch responses include images and amenities

- **GET /api/branches/[id]**
  - Now accepts either branch ID or branch code
  - Returns branch with `short_code` and total seat count
  - Includes branch images and amenities in the response

- **GET /api/branches/[id]/seats**
  - Access seats for a branch using either ID or branch code
  - Filter by `seating_type_id` or `seating_type_code`
  - Seats are organized by seating type

- **GET /api/branches/stats**
  - New endpoint to get detailed statistics about branches and seating types
  - Returns counts of total seats, booked seats, and available seats
  - Supports optional filtering by `branch_code`
  - Supports date-based availability with `date` parameter
  - For hourly bookings, supports time range filtering with `start_time` and `end_time` parameters
  - Shows all individual seats with their current availability status
  - Distinguishes between permanently booked seats and temporarily booked seats (via bookings)

### User and Customer Endpoints

- **User and Customer profiles**
  - User and customer responses now include `profile_picture` field
  - Profile pictures use consistent format and paths

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

### Branch with Seats, Images and Amenities Example:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Downtown Branch",
    "address": "123 Main St",
    "location": "Downtown",
    "short_code": "DOW",
    "images": [
      {
        "id": 1,
        "image_url": "/images/branches/hotdesk-1.jpg",
        "is_primary": true,
        "seating_type": "HOT_DESK"
      },
      {
        "id": 2,
        "image_url": "/images/branches/meeting-1.jpg",
        "is_primary": false,
        "seating_type": "MEETING_ROOM"
      }
    ],
    "amenities": [
      {
        "id": 1,
        "name": "WiFi",
        "icon": "wifi",
        "description": "High-speed wireless internet"
      },
      {
        "id": 2,
        "name": "Coffee",
        "icon": "coffee",
        "description": "Complimentary coffee and tea"
      }
    ],
    "seating_types": [
      {
        "id": 1,
        "name": "Hot Desk",
        "short_code": "HTD",
        "description": "Flexible seating",
        "hourly_rate": 10,
        "is_hourly": false,
        "min_booking_duration": 1,
        "min_seats": 1,
        "seats": [
          {
            "id": 1,
            "seat_code": "HTD001",
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

### User Response with Profile Picture Example:

```json
{
  "success": true,
  "data": {
    "id": 101,
    "name": "John Doe",
    "email": "john@example.com",
    "profile_picture": "/images/profiles/avatar-3.jpg",
    "phone": "555-123-4567",
    "company_name": "ACME Inc"
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
      "seat_code": "HTD001",
      "price": 10,
      "availability_status": "available",
      "Branch": {
        "id": 1,
        "name": "Downtown Branch",
        "short_code": "DOW"
      },
      "SeatingType": {
        "id": 1,
        "name": "Hot Desk",
        "short_code": "HTD"
      }
    },
    "bookings": []
  }
}
```

### Branch Stats Response Example:

```json
{
  "success": true,
  "message": "Branch stats retrieved successfully",
  "data": [
    {
      "id": 1,
      "name": "Downtown Branch",
      "short_code": "DOW",
      "address": "123 Main St",
      "location": "Downtown",
      "opening_time": "08:00:00",
      "closing_time": "18:00:00",
      "total_seats": 20,
      "available_seats": 15,
      "booked_seats": 5,
      "seating_types": [
        {
          "id": 1,
          "name": "HOT_DESK",
          "short_code": "HTD",
          "description": "Flexible workspace",
          "total_seats": 10,
          "available_seats": 8,
          "booked_seats": 2,
          "is_hourly": false,
          "hourly_rate": 10,
          "seats": [
            {
              "id": 1,
              "seat_code": "HTD001",
              "seat_number": "A1",
              "price": 10,
              "status": "available",
              "has_booking": false
            },
            {
              "id": 2,
              "seat_code": "HTD002",
              "seat_number": "A2",
              "price": 10,
              "status": "booked",
              "has_booking": true
            }
          ]
        },
        {
          "id": 2,
          "name": "DEDICATED_DESK",
          "short_code": "DED",
          "description": "Dedicated workspace",
          "total_seats": 10,
          "available_seats": 7,
          "booked_seats": 3,
          "is_hourly": false,
          "hourly_rate": 15,
          "seats": [
            {
              "id": 11,
              "seat_code": "DED001",
              "seat_number": "B1",
              "price": 15,
              "status": "booked",
              "has_booking": false
            }
          ]
        }
      ]
    }
  ]
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
      "short_code": "DOW",
      "location": "Downtown",
      "address": "123 Main St",
      "opening_time": "08:00:00",
      "closing_time": "18:00:00"
    },
    "seating_type": {
      "id": 1,
      "name": "HOT_DESK",
      "short_code": "HTD",
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
        "seat_code": "HTD001",
        "price": 10
      },
      {
        "id": 2,
        "seat_number": "A2",
        "seat_code": "HTD002",
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
        "seat_code": "HTD001"
      },
      "meeting_room": null,
      "seating_type": {
        "id": 1,
        "name": "HOT_DESK",
        "short_code": "HTD",
        "description": "Flexible workspace",
        "hourly_rate": 10.00,
        "is_hourly": true,
        "min_booking_duration": 1,
        "min_seats": 1
      },
      "branch": {
        "id": 5,
        "name": "Downtown Branch",
        "short_code": "DOW",
        "address": "123 Main St",
        "location": "Downtown"
      },
      "customer": {
        "id": 101,
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "555-123-4567",
        "profile_picture": "/images/profiles/avatar-5.jpg",
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
      "seat_code": "HTD001"
    },
    "seating_type": {
      "id": 1,
      "name": "HOT_DESK",
      "short_code": "HTD",
      "description": "Flexible workspace"
    },
    "branch": {
      "id": 1,
      "name": "Downtown Branch",
      "short_code": "DOW",
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

## Branch Stats API Usage Guide

The branch stats API provides comprehensive information about seat availability across branches:

- **Basic usage**: `/api/branches/stats` - Returns stats for all branches and their seats
- **Filter by branch**: `/api/branches/stats?branch_code=DOW` - Stats for a specific branch
- **Filter by date**: `/api/branches/stats?date=2023-06-15` - Check availability on specific date
- **Filter by time slot**: `/api/branches/stats?date=2023-06-15&start_time=09:00&end_time=12:00` - For hourly bookings

The API returns important information:
- **Total seats** - The total number of seats in each branch and by seating type
- **Booked seats** - Both permanently booked seats and seats with bookings for the specified time
- **Available seats** - Seats that can be booked for the specified time period
- **Individual seat status** - Each seat with its status and booking information

This API is useful for:
1. Displaying branch seat availability statistics on dashboards
2. Visualizing seat availability by seating type
3. Checking real-time availability for specific dates and times
4. Generating branch occupancy reports

## Branch Images and Amenities

The API now includes support for branch images and amenities:

### Branch Images
- Images are associated with branches based on the seating types they offer
- Each branch has at least one primary image
- Different images may be used for different seating types
- Image URLs follow a standard format like `/images/branches/[type]-[number].jpg`

### Branch Amenities 
- Each branch has a collection of amenities showing available facilities
- Standard amenities include WiFi, Coffee, Printing, etc.
- Amenities include icons for UI display
- Detailed descriptions are provided for each amenity

## Filtering Bookings by Status

You can filter bookings by status using the `status` query parameter:

- **active**: Currently ongoing bookings
- **upcoming**: Future confirmed bookings
- **cancelled**: All cancelled bookings
- **completed**: Past bookings (either explicitly marked as completed or past their end time)

Example: `/api/bookings?status=active&branch=DOW&type=HTD`

## Booking Different Seating Types

For booking different seating types, use the following requirements:

1. **Hot Desk** (short_code: HTD)
   - Minimum duration: 1 month
   - Minimum seats: 1
   - Example: `/api/slots/available?branch_code=DOW&seating_type_code=HTD&start_date=2023-06-15`

2. **Dedicated Desk** (short_code: DED)
   - Minimum duration: 1 month
   - Minimum seats: 1
   - Example: `/api/slots/available?branch_code=DOW&seating_type_code=DED&start_date=2023-06-15`

3. **Cubicle** (short_code: CUB)
   - Minimum duration: 1 month
   - Example: `/api/slots/available?branch_code=DOW&seating_type_code=CUB&start_date=2023-06-15`

4. **Meeting Room** (short_code: MTG)
   - Hourly booking
   - Minimum duration: 1 hour
   - Example: `/api/slots/available?branch_code=DOW&seating_type_code=MTG&start_date=2023-06-15&start_time=09:00&end_time=11:00`

5. **Daily Pass** (short_code: DPS)
   - Minimum duration: 1 day
   - Example: `/api/slots/available?branch_code=DOW&seating_type_code=DPS&start_date=2023-06-15`

## Validation Improvements

The API now includes comprehensive validation:

- **Short Codes**: All short codes are validated to ensure they follow the 3-letter format
- **Seat Codes**: Seat codes follow the pattern of seating type code followed by 3-digit sequence number
- **Dates and Times**: All date and time parameters are validated for format and validity
- **Authentication**: Enhanced JWT validation to ensure proper authentication
- **Request Bodies**: All JSON payloads are validated for structure and required fields

## Troubleshooting

If you encounter any issues:

1. Verify all migrations ran successfully
2. Check that your environment has the necessary database schema
3. Ensure branch and seating type records have valid short codes
4. For any records missing codes, you can run the migration scripts again

For additional assistance, refer to the codebase documentation or contact the development team.

## API Endpoints Update

### New Endpoints

- `GET /api/branches/stats`: Get detailed statistics about branches and seating types, including total, booked, and available seats. Supports filtering by branch_code, date, and time range.
- `GET /api/slots/available`: Get available slots for different seating types in a branch. Supports filtering by branch_code, seating_type_code, and date range.
- `POST /api/profile/upload`: Upload a profile picture for a user. Requires authentication and supports image validation.
- `POST /api/branches/images/upload`: Upload branch images categorized by seating type. Supports primary image designation for each seating type.
- `PATCH /api/branches/images/upload`: Update branch image settings, such as marking an image as primary.
- `DELETE /api/branches/images/upload`: Delete a branch image by ID.

### Updated Endpoints

- `POST /api/bookings`: Updated to support different seating types with specific requirements for each type:
  - Hot Desks require a minimum booking duration of 1 month
  - Dedicated Desks require a minimum booking duration of 1 month with at least 1 seat
  - Cubicles now have specific types (3-seater, 4-seater, 6-seater, 10-seater) with different pricing

## Branch Images and Profiles

We've enhanced visual representation of branches and users with image support:

### Branch Images
- Images are stored and managed using Cloudinary for optimized delivery
- Each branch can have multiple images for each seating type (HOT_DESK, DEDICATED_DESK, etc.)
- One image per seating type can be designated as primary for display purposes
- Images are organized in Cloudinary by folders based on seating type for better management
- Support for cubicle seating types split by capacity (3-seater, 4-seater, 6-seater, 10-seater)
- Branch images can be added, updated, and deleted through dedicated API endpoints
- Primary images are used in branch listings and details pages

### User Profile Pictures
- User profiles now support profile pictures stored in Cloudinary
- Images are stored in a dedicated "profiles" folder in Cloudinary
- Support for image validation (file type, size)
- Profile pictures can be updated through a dedicated API endpoint
- Profile pictures are displayed in user profiles and booking information

### Image Upload APIs

#### Upload Profile Picture
```
POST /api/profile/upload
```

Request (multipart/form-data):
```
image: File (jpeg, png, max 5MB)
```

Response:
```json
{
  "success": true,
  "message": "Profile picture uploaded successfully",
  "data": {
    "profile_picture": "https://res.cloudinary.com/example/image/upload/v1234/profiles/user_123.jpg"
  }
}
```

#### Upload Branch Image
```
POST /api/branches/images/upload
```

Request (multipart/form-data):
```
image: File (jpeg, png, max 10MB)
branch_id: "1"
seating_type: "HOT_DESK"
is_primary: "true" | "false"
index: "1" (optional, for organizing multiple images)
```

Response:
```json
{
  "success": true,
  "message": "Branch image uploaded successfully",
  "data": {
    "id": 1,
    "branch_id": "1",
    "image_url": "https://res.cloudinary.com/example/image/upload/v1234/branches/hot_desk/branch_1_1.jpg",
    "is_primary": true,
    "seating_type": "HOT_DESK"
  }
}
``` 