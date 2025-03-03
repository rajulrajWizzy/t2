import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '@/config/database';
import { SeatBooking, SeatBookingAttributes, BookingStatusEnum } from '@/types/booking';

// Interface for creation attributes
interface SeatBookingCreationAttributes extends Optional<SeatBookingAttributes, 'id' | 'created_at' | 'updated_at' | 'status'> {}

// Define the SeatBooking model
class SeatBookingModel extends Model<SeatBooking, SeatBookingCreationAttributes> implements SeatBooking {
  public id!: number;
  public customer_id!: number;
  public seat_id!: number;
  public start_time!: Date;
  public end_time!: Date;
  public total_price!: number;
  public status!: BookingStatusEnum;
  public created_at!: Date;
  public updated_at!: Date;

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
    total_price: {
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