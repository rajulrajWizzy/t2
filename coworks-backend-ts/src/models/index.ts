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
import BranchImageModel from './branchImage';
import PaymentLogModel from './paymentLog';
import AdminModel from './admin';
import AdminBranchModel from './adminBranch';
import SupportTicketModel from './supportTicket';
import TicketMessageModel from './ticketMessage';
import CustomerCoinModel from './customerCoin';
import CoinTransactionModel from './coinTransaction';
import MaintenanceBlockModel from './maintenanceBlock';

// Define associations with explicit aliases
BranchModel.hasMany(SeatModel, { foreignKey: 'branch_id', as: 'Seats' });
SeatModel.belongsTo(BranchModel, { foreignKey: 'branch_id', as: 'Branch' });

BranchModel.hasMany(BranchImageModel, { foreignKey: 'branch_id', as: 'Images' });
BranchImageModel.belongsTo(BranchModel, { foreignKey: 'branch_id', as: 'Branch' });

// Admin-Branch associations
AdminModel.hasMany(AdminBranchModel, { foreignKey: 'admin_id', as: 'AdminBranches' });
AdminBranchModel.belongsTo(AdminModel, { foreignKey: 'admin_id', as: 'Admin' });

BranchModel.hasMany(AdminBranchModel, { foreignKey: 'branch_id', as: 'AdminBranches' });
AdminBranchModel.belongsTo(BranchModel, { foreignKey: 'branch_id', as: 'Branch' });

// Legacy direct branch association (will be deprecated)
BranchModel.hasMany(AdminModel, { foreignKey: 'branch_id', as: 'Admins' });
AdminModel.belongsTo(BranchModel, { foreignKey: 'branch_id', as: 'Branch' });

// Support ticket associations
BranchModel.hasMany(SupportTicketModel, { foreignKey: 'branch_id', as: 'SupportTickets' });
SupportTicketModel.belongsTo(BranchModel, { foreignKey: 'branch_id', as: 'Branch' });

CustomerModel.hasMany(SupportTicketModel, { foreignKey: 'customer_id', as: 'SupportTickets' });
SupportTicketModel.belongsTo(CustomerModel, { foreignKey: 'customer_id', as: 'Customer' });

SeatingTypeModel.hasMany(SupportTicketModel, { foreignKey: 'seating_type_id', as: 'SupportTickets' });
SupportTicketModel.belongsTo(SeatingTypeModel, { foreignKey: 'seating_type_id', as: 'SeatingType' });

AdminModel.hasMany(SupportTicketModel, { foreignKey: 'assigned_to', as: 'AssignedTickets' });
SupportTicketModel.belongsTo(AdminModel, { foreignKey: 'assigned_to', as: 'AssignedAdmin' });

SupportTicketModel.hasMany(TicketMessageModel, { foreignKey: 'ticket_id', as: 'Messages' });
TicketMessageModel.belongsTo(SupportTicketModel, { foreignKey: 'ticket_id', as: 'Ticket' });

// Existing associations
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

// Payment log associations
SeatBookingModel.hasMany(PaymentLogModel, {
  foreignKey: 'booking_id',
  constraints: false,
  scope: { booking_type: 'seat' },
  as: 'PaymentLogs'
});
PaymentLogModel.belongsTo(SeatBookingModel, {
  foreignKey: 'booking_id',
  constraints: false,
  as: 'SeatBooking'
});

MeetingBookingModel.hasMany(PaymentLogModel, {
  foreignKey: 'booking_id',
  constraints: false,
  scope: { booking_type: 'meeting' },
  as: 'PaymentLogs'
});
PaymentLogModel.belongsTo(MeetingBookingModel, {
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

// Coin associations
CustomerModel.hasOne(CustomerCoinModel, { foreignKey: 'customer_id', as: 'Coins' });
CustomerCoinModel.belongsTo(CustomerModel, { foreignKey: 'customer_id', as: 'Customer' });

CustomerModel.hasMany(CoinTransactionModel, { foreignKey: 'customer_id', as: 'CoinTransactions' });
CoinTransactionModel.belongsTo(CustomerModel, { foreignKey: 'customer_id', as: 'Customer' });

// Maintenance Block associations
SeatModel.hasMany(MaintenanceBlockModel, { foreignKey: 'seat_id', as: 'MaintenanceBlocks' });
MaintenanceBlockModel.belongsTo(SeatModel, { foreignKey: 'seat_id', as: 'Seat' });

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
  PasswordReset: PasswordResetModel,
  BranchImage: BranchImageModel,
  PaymentLog: PaymentLogModel,
  Admin: AdminModel,
  AdminBranch: AdminBranchModel,
  SupportTicket: SupportTicketModel,
  TicketMessage: TicketMessageModel,
  CustomerCoin: CustomerCoinModel,
  CoinTransaction: CoinTransactionModel,
  MaintenanceBlock: MaintenanceBlockModel,
  Sequelize: sequelize.Sequelize
};
export default models;