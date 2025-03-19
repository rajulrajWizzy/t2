import sequelize from '@/config/database';
import BranchModel from './branch';
import CustomerModel from './customer';
import SeatingTypeModel from './seatingType';
import SeatModel from './seat';
import SeatBookingModel from './seatBooking';
import MeetingBookingModel from './meetingBooking';
import PaymentModel from './payment';
import TimeSlotModel from './timeSlot';
import BlacklistedTokenModel from './blacklistedToken';
import PasswordResetModel from './passwordReset';

// Define associations with explicit aliases
BranchModel.hasMany(SeatModel, { foreignKey: 'branch_id', as: 'Seats' });
SeatModel.belongsTo(BranchModel, { foreignKey: 'branch_id', as: 'Branch' });

SeatingTypeModel.hasMany(SeatModel, { foreignKey: 'seating_type_id', as: 'Seats' });
SeatModel.belongsTo(SeatingTypeModel, { foreignKey: 'seating_type_id', as: 'SeatingType' });

CustomerModel.hasMany(SeatBookingModel, { foreignKey: 'customer_id', as: 'SeatBookings' });
SeatBookingModel.belongsTo(CustomerModel, { foreignKey: 'customer_id', as: 'Customer' });

CustomerModel.hasMany(MeetingBookingModel, { foreignKey: 'customer_id', as: 'MeetingBookings' });
MeetingBookingModel.belongsTo(CustomerModel, { foreignKey: 'customer_id', as: 'Customer' });

SeatModel.hasMany(SeatBookingModel, { foreignKey: 'seat_id', as: 'Bookings' });
SeatBookingModel.belongsTo(SeatModel, { foreignKey: 'seat_id', as: 'Seat' });

// Meeting room associations
SeatModel.hasMany(MeetingBookingModel, { foreignKey: 'meeting_room_id', as: 'MeetingBookings' });
MeetingBookingModel.belongsTo(SeatModel, { foreignKey: 'meeting_room_id', as: 'MeetingRoom' });

SeatBookingModel.hasMany(PaymentModel, { 
  foreignKey: 'booking_id',
  constraints: false,
  scope: { booking_type: 'seat' },
  as: 'Payments'
});
PaymentModel.belongsTo(SeatBookingModel, { 
  foreignKey: 'booking_id', 
  constraints: false,
  as: 'SeatBooking'
});

MeetingBookingModel.hasMany(PaymentModel, { 
  foreignKey: 'booking_id',
  constraints: false,
  scope: { booking_type: 'meeting' },
  as: 'Payments'
});
PaymentModel.belongsTo(MeetingBookingModel, { 
  foreignKey: 'booking_id', 
  constraints: false,
  as: 'MeetingBooking'
});

BranchModel.hasMany(TimeSlotModel, { foreignKey: 'branch_id', as: 'TimeSlots' });
TimeSlotModel.belongsTo(BranchModel, { foreignKey: 'branch_id', as: 'Branch' });

SeatModel.hasMany(TimeSlotModel, { foreignKey: 'seat_id', as: 'TimeSlots' });
TimeSlotModel.belongsTo(SeatModel, { foreignKey: 'seat_id', as: 'Seat' });

SeatBookingModel.hasMany(TimeSlotModel, { foreignKey: 'booking_id', as: 'TimeSlots' });
TimeSlotModel.belongsTo(SeatBookingModel, { foreignKey: 'booking_id', as: 'Booking' });

// Export models
const models = {
  sequelize,
  Branch: BranchModel,
  Customer: CustomerModel,
  SeatingType: SeatingTypeModel,
  Seat: SeatModel,
  SeatBooking: SeatBookingModel,
  MeetingBooking: MeetingBookingModel,
  Payment: PaymentModel,
  TimeSlot: TimeSlotModel,
  BlacklistedToken: BlacklistedTokenModel,
  PasswordReset: PasswordResetModel
};
export default models;