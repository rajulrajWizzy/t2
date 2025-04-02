import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '@/config/database';
import { MeetingBooking, MeetingBookingAttributes, BookingStatusEnum } from '@/types/booking';

// Interface for creation attributes
interface MeetingBookingCreationAttributes extends Optional<MeetingBookingAttributes, 'id' | 'created_at' | 'updated_at' | 'status' | 'amenities'> {}

// Define the MeetingBooking model
class MeetingBookingModel extends Model<MeetingBooking, MeetingBookingCreationAttributes> implements MeetingBooking {
  declare id: number;
  declare customer_id: number;
  declare meeting_room_id: number;
  declare start_time: Date;
  declare end_time: Date;
  declare num_participants: number;
  declare amenities: any;
  declare total_price: number;
  declare status: BookingStatusEnum;
  declare created_at: Date;
  declare updated_at: Date;

  // Add any instance methods here
}

MeetingBookingModel.init(
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
    meeting_room_id: {
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
    num_participants: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    amenities: {
      type: DataTypes.JSON,
      allowNull: true,
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
    tableName: 'meeting_bookings',
    sequelize,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

export default MeetingBookingModel;