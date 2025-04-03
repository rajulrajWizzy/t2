import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '@/config/database';
import { TimeSlot, TimeSlotAttributes } from '@/types/booking';

// Interface for creation attributes
interface TimeSlotCreationAttributes extends Optional<TimeSlotAttributes, 'id' | 'created_at' | 'updated_at' | 'is_available' | 'booking_id'> {}

// Define the TimeSlot model
class TimeSlotModel extends Model<TimeSlot, TimeSlotCreationAttributes> implements TimeSlot {
  declare id: number;
  declare branch_id: number;
  declare seat_id: number;
  declare date: string;
  declare start_time: string;
  declare end_time: string;
  declare is_available: boolean;
  declare booking_id: number | null;
  declare created_at: Date;
  declare updated_at: Date;

  // Add any instance methods here
}

TimeSlotModel.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    branch_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'branches',
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
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    start_time: {
      type: DataTypes.TIME,
      allowNull: false,
    },
    end_time: {
      type: DataTypes.TIME,
      allowNull: false,
    },
    is_available: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    booking_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'seat_bookings',
        key: 'id',
      },
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
    tableName: 'time_slots',
    sequelize,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

export default TimeSlotModel;