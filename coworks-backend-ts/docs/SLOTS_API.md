# Slots API Documentation

## GET /api/slots

Retrieve time slots for a specific branch, with optional filtering by seat and seating type.

### Authentication

Requires Bearer token authentication.

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| branch_id | number | Yes | ID of the branch to get slots for |
| seat_id | number | No | Filter slots for a specific seat |
| seating_type_id | number | No | Filter slots by seating type ID |
| seating_type_code | string | No | Filter slots by seating type code |
| date | string | No | Date to get slots for (YYYY-MM-DD format). Defaults to current date |

### Example Request

```http
GET /api/slots?branch_id=1&seating_type_code=meet&date=2024-01-20
Authorization: Bearer <token>
```

### Response Format

```typescript
interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
  error?: string;
}

interface SlotCategory {
  count: number;
  slots: Array<{
    id: number;
    branch_id: number;
    seat_id: number;
    date: string;
    start_time: string; // Format: HH:mm:ss
    end_time: string;   // Format: HH:mm:ss
    is_available: boolean;
    booking_id: number | null;
    Seat: {
      id: number;
      seat_number: string;
      price: number;
      availability_status: string;
      SeatingType: {
        id: number;
        name: string;
        short_code: string;
        hourly_rate: number;
        is_hourly: boolean;
      };
    };
    Branch: {
      id: number;
      name: string;
      address: string;
    };
    Booking?: {
      id: number;
      // Additional booking details
    };
  }>;
}

interface SlotsBranchResponse {
  date: string;
  branch_id: number;
  total_slots: number;
  available: SlotCategory;
  booked: SlotCategory;
  maintenance: SlotCategory;
}
```

### Example Response

```json
{
  "success": true,
  "message": "Slots retrieved successfully",
  "data": {
    "date": "2024-01-20",
    "branch_id": 1,
    "total_slots": 24,
    "available": {
      "count": 16,
      "slots": [
        {
          "id": 1,
          "branch_id": 1,
          "seat_id": 5,
          "date": "2024-01-20",
          "start_time": "09:00:00",
          "end_time": "10:00:00",
          "is_available": true,
          "booking_id": null,
          "Seat": {
            "id": 5,
            "seat_number": "MR-01",
            "price": 50,
            "availability_status": "AVAILABLE",
            "SeatingType": {
              "id": 4,
              "name": "MEETING_ROOM",
              "short_code": "meet",
              "hourly_rate": 50,
              "is_hourly": true
            }
          },
          "Branch": {
            "id": 1,
            "name": "Downtown Branch",
            "address": "123 Main St"
          }
        }
      ]
    },
    "booked": {
      "count": 6,
      "slots": []
    },
    "maintenance": {
      "count": 2,
      "slots": []
    }
  }
}
```

### Notes

1. For meeting rooms, slots are created in 1-hour intervals between branch opening and closing hours
2. For other seating types, slots are created in 2-hour intervals
3. Slots are categorized into:
   - Available: Slots that can be booked
   - Booked: Slots that are already reserved
   - Maintenance: Slots where the seat is under maintenance
4. The response includes detailed information about the seat, seating type, and branch
5. Booking information is included for booked slots