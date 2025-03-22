// src/models/seatingType.ts
import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '@/config/database';
import { SeatingType, SeatingTypeAttributes, SeatingTypeEnum } from '@/types/seating';

// Interface for creation attributes
interface SeatingTypeCreationAttributes extends Optional<SeatingTypeAttributes, 'id' | 'created_at' | 'updated_at' | 'short_code' | 'capacity_options' | 'quantity_options' | 'cost_multiplier'> {}

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
  public capacity_options!: number[] | null; // Available capacity options
  public quantity_options!: number[] | null; // Available quantity options for booking multiple units
  public cost_multiplier!: Record<string, number> | null; // Cost multipliers for different quantities
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
  
  // Get default capacity options based on seating type
  public static getDefaultCapacityOptions(name: SeatingTypeEnum): number[] | null {
    switch (name) {
      case SeatingTypeEnum.CUBICLE:
        return [1, 2, 4, 6, 8];
      case SeatingTypeEnum.MEETING_ROOM:
        return [4, 6, 8, 10, 12, 16, 20];
      default:
        return null;
    }
  }
  
  // Get default quantity options based on seating type
  public static getDefaultQuantityOptions(name: SeatingTypeEnum): number[] | null {
    switch (name) {
      case SeatingTypeEnum.HOT_DESK:
        return [1, 2, 3, 4, 5, 10];
      case SeatingTypeEnum.DEDICATED_DESK:
        return [1, 2, 3, 4, 5];
      default:
        return null;
    }
  }
  
  // Get default cost multipliers based on seating type
  public static getDefaultCostMultipliers(name: SeatingTypeEnum): Record<string, number> | null {
    switch (name) {
      case SeatingTypeEnum.HOT_DESK:
        return {
          "1": 1.0,
          "2": 0.95,
          "3": 0.90,
          "4": 0.85,
          "5": 0.80,
          "10": 0.75
        };
      case SeatingTypeEnum.DEDICATED_DESK:
        return {
          "1": 1.0,
          "2": 0.95,
          "3": 0.92,
          "4": 0.90,
          "5": 0.85
        };
      default:
        return null;
    }
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
    capacity_options: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: null,
    },
    quantity_options: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: null,
    },
    cost_multiplier: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: null,
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
        
        // Set default capacity options if not provided and this is a configurable type
        if (!seatingType.capacity_options) {
          seatingType.capacity_options = SeatingTypeModel.getDefaultCapacityOptions(seatingType.name);
        }
        
        // Set default quantity options if not provided for applicable types
        if (!seatingType.quantity_options) {
          seatingType.quantity_options = SeatingTypeModel.getDefaultQuantityOptions(seatingType.name);
        }
        
        // Set default cost multipliers if not provided for applicable types
        if (!seatingType.cost_multiplier) {
          seatingType.cost_multiplier = SeatingTypeModel.getDefaultCostMultipliers(seatingType.name);
        }
      }
    }
  }
);

export default SeatingTypeModel;