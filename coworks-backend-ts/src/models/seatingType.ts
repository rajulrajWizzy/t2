// src/models/seatingType.ts
import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '@/config/database';
import { SeatingType, SeatingTypeAttributes, SeatingTypeEnum } from '@/types/seating';

// Interface for creation attributes
interface SeatingTypeCreationAttributes extends Optional<SeatingTypeAttributes, 'id' | 'created_at' | 'updated_at' | 'short_code'> {}

// Define the SeatingType model
class SeatingTypeModel extends Model<SeatingType, SeatingTypeCreationAttributes> implements SeatingType {
  public id!: number;
  public name!: SeatingTypeEnum;
  public description!: string | null;
  public hourly_rate!: number;
  public is_hourly!: boolean;
  public min_booking_duration!: number;
  public min_seats!: number; // Added new field for minimum seats
  public short_code!: string; // Short code for API calls
  public created_at!: Date;
  public updated_at!: Date;

  // Generate standard short code for seating type
  public static generateShortCode(name: SeatingTypeEnum): string {
    const shortCodes: Record<SeatingTypeEnum, string> = {
      [SeatingTypeEnum.HOT_DESK]: 'HD',
      [SeatingTypeEnum.DEDICATED_DESK]: 'DD',
      [SeatingTypeEnum.CUBICLE]: 'CU',
      [SeatingTypeEnum.MEETING_ROOM]: 'MR',
      [SeatingTypeEnum.DAILY_PASS]: 'DP',
    };
    
    return shortCodes[name] || name.substring(0, 2).toUpperCase();
  }
}

SeatingTypeModel.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.ENUM(...Object.values(SeatingTypeEnum)),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    hourly_rate: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00,
    },
    is_hourly: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    min_booking_duration: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 2,
    },
    min_seats: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    short_code: {
      type: DataTypes.STRING(10),
      allowNull: false,
      unique: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'seating_types',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    hooks: {
      beforeValidate: (seatingType: SeatingTypeModel) => {
        // Generate short_code if not provided
        if (!seatingType.short_code) {
          seatingType.short_code = SeatingTypeModel.generateShortCode(seatingType.name);
        }
      }
    }
  }
);

export default SeatingTypeModel;