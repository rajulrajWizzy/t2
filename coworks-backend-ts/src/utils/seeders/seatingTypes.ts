// src/utils/seeders/seatingTypes.ts
import { SeatingTypeEnum, SeatingTypeCode, SeatingTypeDisplayNames } from "@/types/seating";

const seatingTypes = [
  {
    name: SeatingTypeEnum.HOT_DESK,
    code: SeatingTypeCode.HOT_DESK,
    display_name: SeatingTypeDisplayNames[SeatingTypeEnum.HOT_DESK],
    description: 'Flexible desk space with minimum 2-month commitment',
    hourly_rate: 150.00,
    is_hourly: false,
    min_booking_duration: 60, // 60 days (2 months)
    min_seats: 1
  },
  {
    name: SeatingTypeEnum.DEDICATED_DESK,
    code: SeatingTypeCode.DEDICATED_DESK,
    display_name: SeatingTypeDisplayNames[SeatingTypeEnum.DEDICATED_DESK],
    description: 'Permanently assigned desk with minimum 3-month commitment and 10-seat minimum',
    hourly_rate: 200.00,
    is_hourly: false,
    min_booking_duration: 90, // 90 days (3 months)
    min_seats: 10
  },
  {
    name: SeatingTypeEnum.CUBICLE,
    code: SeatingTypeCode.CUBICLE,
    display_name: SeatingTypeDisplayNames[SeatingTypeEnum.CUBICLE],
    description: 'Semi-private workspace with minimum 3-month commitment',
    hourly_rate: 250.00,
    is_hourly: false,
    min_booking_duration: 90, // 90 days (3 months)
    min_seats: 1
  },
  {
    name: SeatingTypeEnum.MEETING_ROOM,
    code: SeatingTypeCode.MEETING_ROOM,
    display_name: SeatingTypeDisplayNames[SeatingTypeEnum.MEETING_ROOM],
    description: 'Private room for meetings and conferences',
    hourly_rate: 500.00,
    is_hourly: true, // Stays hourly
    min_booking_duration: 2, // Minimum 2 hours
    min_seats: 1
  },
  {
    name: SeatingTypeEnum.DAILY_PASS,
    code: SeatingTypeCode.DAILY_PASS,
    display_name: SeatingTypeDisplayNames[SeatingTypeEnum.DAILY_PASS],
    description: 'Full day access to hot desk spaces based on availability',
    hourly_rate: 800.00,
    is_hourly: false,
    min_booking_duration: 1, // 1 day minimum
    min_seats: 1
  }
];

export default seatingTypes;