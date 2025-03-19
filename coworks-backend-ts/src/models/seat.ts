import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '@/config/database';
import { Seat, SeatAttributes, AvailabilityStatusEnum } from '@/types/seating';

// Interface for creation attributes
interface SeatCreationAttributes extends Optional<SeatAttributes, 'id' | 'created_at' | 'updated_at' | 'availability_status'> {}

// Define the Seat model
class SeatModel extends Model<Seat, SeatCreationAttributes> implements Seat {
  public id!: number;
  public branch_id!: number;
  public seating_type_id!: number;
  public seat_number!: string;
  public price!: number;
  public availability_status!: AvailabilityStatusEnum;
  public created_at!: Date;
  public updated_at!: Date;

  // Add any instance methods here
}

SeatModel.init(
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
    seating_type_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'seating_types',
        key: 'id',
      },
    },
    seat_number: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    availability_status: {
      type: DataTypes.ENUM(...Object.values(AvailabilityStatusEnum)),
      defaultValue: AvailabilityStatusEnum.AVAILABLE,
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
    tableName: 'seats',
    sequelize,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

export default SeatModel;