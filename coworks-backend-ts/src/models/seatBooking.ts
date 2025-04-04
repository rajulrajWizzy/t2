import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '@/config/database';
import { SeatBooking, SeatBookingAttributes, BookingStatusEnum } from '@/types/booking';

// Interface for creation attributes
interface SeatBookingCreationAttributes extends Optional<SeatBookingAttributes, 'id' | 'created_at' | 'updated_at' | 'status'> {}

// Define the SeatBooking model
class SeatBookingModel extends Model<SeatBooking, SeatBookingCreationAttributes> implements SeatBooking {
  declare id: number;
  declare customer_id: number;
  declare seat_id: number;
  declare start_time: Date;
  declare end_time: Date;
  declare total_amount: number;
  declare status: BookingStatusEnum;
  declare created_at: Date;
  declare updated_at: Date;

  // Add any instance methods here
}

SeatBookingModel.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    customer_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'customers',
        key: 'id',
      },
    },
    seat_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'seats',
        key: 'id',
      },
    },
    start_time: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    end_time: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    total_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(BookingStatusEnum)),
      defaultValue: BookingStatusEnum.PENDING,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: 'seat_bookings',
    sequelize,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

export default SeatBookingModel;