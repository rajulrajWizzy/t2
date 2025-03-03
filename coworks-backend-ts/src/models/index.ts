import sequelize from '@/config/database';
import BranchModel from './branch';
import CustomerModel from './customer';
import SeatingTypeModel from './seatingType';
import SeatModel from './seat';
import SeatBookingModel from './seatBooking';
import MeetingBookingModel from './meetingBooking';
import PaymentModel from './payment';
import TimeSlotModel from './timeSlot';

// Define associations
BranchModel.hasMany(SeatModel, { foreignKey: 'branch_id' });
SeatModel.belongsTo(BranchModel, { foreignKey: 'branch_id' });

SeatingTypeModel.hasMany(SeatModel, { foreignKey: 'seating_type_id' });
SeatModel.belongsTo(SeatingTypeModel, { foreignKey: 'seating_type_id' });

CustomerModel.hasMany(SeatBookingModel, { foreignKey: 'customer_id' });
SeatBookingModel.belongsTo(CustomerModel, { foreignKey: 'customer_id' });

CustomerModel.hasMany(MeetingBookingModel, { foreignKey: 'customer_id' });
MeetingBookingModel.belongsTo(CustomerModel, { foreignKey: 'customer_id' });

SeatModel.hasMany(SeatBookingModel, { foreignKey: 'seat_id' });
SeatBookingModel.belongsTo(SeatModel, { foreignKey: 'seat_id' });

SeatModel.hasMany(MeetingBookingModel, { foreignKey: 'meeting_room_id', as: 'MeetingRoom' });
MeetingBookingModel.belongsTo(SeatModel, { foreignKey: 'meeting_room_id', as: 'MeetingRoom' });

SeatBookingModel.hasMany(PaymentModel, { 
  foreignKey: 'booking_id',
  constraints: false,
  scope: { booking_type: 'seat' } 
});
PaymentModel.belongsTo(SeatBookingModel, { foreignKey: 'booking_id', constraints: false });

MeetingBookingModel.hasMany(PaymentModel, { 
  foreignKey: 'booking_id',
  constraints: false,
  scope: { booking_type: 'meeting' } 
});
PaymentModel.belongsTo(MeetingBookingModel, { foreignKey: 'booking_id', constraints: false });

BranchModel.hasMany(TimeSlotModel, { foreignKey: 'branch_id' });
TimeSlotModel.belongsTo(BranchModel, { foreignKey: 'branch_id' });

SeatModel.hasMany(TimeSlotModel, { foreignKey: 'seat_id' });
TimeSlotModel.belongsTo(SeatModel, { foreignKey: 'seat_id' });

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
  TimeSlot: TimeSlotModel
};

export default models;