import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '@/config/database';
import { Seat, SeatAttributes, AvailabilityStatusEnum } from '@/types/seating';
import models from '@/models';

// Interface for creation attributes
interface SeatCreationAttributes extends Optional<SeatAttributes, 'id' | 'created_at' | 'updated_at' | 'availability_status' | 'seat_code' | 'capacity' | 'is_configurable'> {}

// Define the Seat model
class SeatModel extends Model<Seat, SeatCreationAttributes> implements Seat {
  declare id: number;
  declare branch_id: number;
  declare seating_type_id: number;
  declare seat_number: string;
  declare seat_code: string; // Added seat_code e.g. HD101
  declare price: number;
  declare capacity: number | null;
  declare is_configurable: boolean;
  declare availability_status: AvailabilityStatusEnum;
  declare created_at: Date;
  declare updated_at: Date;

  // Generate a seat code based on seating type and sequence
  public static async generateSeatCode(seatingTypeId: number, branchId: number): Promise<string> {
    try {
      if (!seatingTypeId || !branchId) {
        throw new Error('Missing required parameters: seating type ID or branch ID');
      }

      // Get the seating type to get its short code
      const seatingType = await models.SeatingType.findByPk(seatingTypeId);
      if (!seatingType) {
        console.error(`Seating type with ID ${seatingTypeId} not found`);
        return `SEAT-${Date.now().toString().slice(-6)}`; // Fallback code
      }
      
      // Get the branch
      const branch = await models.Branch.findByPk(branchId);
      if (!branch) {
        console.error(`Branch with ID ${branchId} not found`);
        return `${seatingType.short_code || 'SEAT'}-${Date.now().toString().slice(-6)}`; // Use available info
      }
      
      // Use the short_code if available, otherwise use a placeholder
      const typeCode = seatingType.short_code || 'SEAT';
      
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
      return `SEAT${Date.now().toString().slice(-6)}`; // Unique fallback
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
    capacity: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
    },
    is_configurable: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
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
        
        // Set capacity based on seating type if not provided and this is a new seat
        if ((seat.capacity === null || seat.capacity === undefined) && !seat.isNewRecord) {
          try {
            const seatingType = await models.SeatingType.findByPk(seat.seating_type_id);
            if (seatingType) {
              // Set default capacity based on seating type
              if (seatingType.short_code === 'CU') {
                seat.capacity = 1; // Default for cubicle
                seat.is_configurable = true;
              } else if (seatingType.short_code === 'MR') {
                seat.capacity = 8; // Default for meeting room
                seat.is_configurable = true;
              } else {
                seat.capacity = null;
                seat.is_configurable = false;
              }
            }
          } catch (error) {
            console.error('Error setting default capacity:', error);
          }
        }
      }
    }
  }
);

export default SeatModel;