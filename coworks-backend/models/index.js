// models/index.js
import sequelize from '../config/database.js';
import Branch from './branch.js';
import Customer from './customer.js';
import SeatingType from './seatingtype.js';
import Seat from './seat.js';
import SeatBooking from './seatbooking.js';
import MeetingBooking from './meetingbooking.js';
import Payment from './payment.js';

// Define associations
Branch.hasMany(Seat, { foreignKey: 'branch_id' });
Seat.belongsTo(Branch, { foreignKey: 'branch_id' });

SeatingType.hasMany(Seat, { foreignKey: 'seating_type_id' });
Seat.belongsTo(SeatingType, { foreignKey: 'seating_type_id' });

Customer.hasMany(SeatBooking, { foreignKey: 'customer_id' });
SeatBooking.belongsTo(Customer, { foreignKey: 'customer_id' });

Customer.hasMany(MeetingBooking, { foreignKey: 'customer_id' });
MeetingBooking.belongsTo(Customer, { foreignKey: 'customer_id' });

Seat.hasMany(SeatBooking, { foreignKey: 'seat_id' });
SeatBooking.belongsTo(Seat, { foreignKey: 'seat_id' });

Seat.hasMany(MeetingBooking, { foreignKey: 'meeting_room_id', as: 'MeetingRoom' });
MeetingBooking.belongsTo(Seat, { foreignKey: 'meeting_room_id', as: 'MeetingRoom' });

SeatBooking.hasMany(Payment, { foreignKey: 'booking_id', constraints: false, scope: { booking_type: 'seat' } });
Payment.belongsTo(SeatBooking, { foreignKey: 'booking_id', constraints: false });

MeetingBooking.hasMany(Payment, { foreignKey: 'booking_id', constraints: false, scope: { booking_type: 'meeting' } });
Payment.belongsTo(MeetingBooking, { foreignKey: 'booking_id', constraints: false });

// Export models
const models = {
  sequelize,
  Branch,
  Customer,
  SeatingType,
  Seat,
  SeatBooking,
  MeetingBooking,
  Payment
};

export default models;
