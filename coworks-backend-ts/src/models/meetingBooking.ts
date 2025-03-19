import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '@/config/database';
import { MeetingBooking, MeetingBookingAttributes, BookingStatusEnum } from '@/types/booking';

// Interface for creation attributes
interface MeetingBookingCreationAttributes extends Optional<MeetingBookingAttributes, 'id' | 'created_at' | 'updated_at' | 'status' | 'amenities'> {}

// Define the MeetingBooking model
class MeetingBookingModel extends Model<MeetingBooking, MeetingBookingCreationAttributes> implements MeetingBooking {
  public id!: number;
  public customer_id!: number;
  public meeting_room_id!: number;
  public start_time!: Date;
  public end_time!: Date;
  public num_participants!: number;
  public amenities!: any;
  public total_price!: number;
  public status!: BookingStatusEnum;
  public created_at!: Date;
  public updated_at!: Date;

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