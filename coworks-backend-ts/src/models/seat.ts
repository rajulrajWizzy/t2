import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '@/config/database';
import { Seat, SeatAttributes, AvailabilityStatusEnum } from '@/types/seating';
import models from '@/models';

// Interface for creation attributes
interface SeatCreationAttributes extends Optional<SeatAttributes, 'id' | 'created_at' | 'updated_at' | 'availability_status' | 'seat_code'> {}

// Define the Seat model
class SeatModel extends Model<Seat, SeatCreationAttributes> implements Seat {
  public id!: number;
  public branch_id!: number;
  public seating_type_id!: number;
  public seat_number!: string;
  public seat_code!: string; // Added seat_code e.g. HD101
  public price!: number;
  public availability_status!: AvailabilityStatusEnum;
  public created_at!: Date;
  public updated_at!: Date;

  // Generate a seat code based on seating type and sequence
  public static async generateSeatCode(seatingTypeId: number, branchId: number): Promise<string> {
    try {
      // Get the seating type to get its short code
      const seatingType = await models.SeatingType.findByPk(seatingTypeId);
      const branch = await models.Branch.findByPk(branchId);
      
      if (!seatingType || !branch) {
        throw new Error('Seating type or branch not found');
      }
      
      const typeCode = seatingType.short_code;
      
      // Count existing seats of this type in this branch to determine sequence number
      const seatsCount = await models.Seat.count({
        where: {
          seating_type_id: seatingTypeId,
          branch_id: branchId
        }
      });
      
      // Format: [SeatingTypeShortCode][3-digit sequence number]
      const sequenceNumber = (seatsCount + 1).toString().padStart(3, '0');
      
      return `${typeCode}${sequenceNumber}`;
    } catch (error) {
      console.error('Error generating seat code:', error);
      return `SEAT${Date.now().toString().slice(-6)}`;
    }
  }
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
    seat_code: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
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
    hooks: {
      beforeValidate: async (seat: SeatModel) => {
        // Generate seat_code if not provided
        if (!seat.seat_code) {
          seat.seat_code = await SeatModel.generateSeatCode(seat.seating_type_id, seat.branch_id);
        }
      }
    }
  }
);

export default SeatModel;