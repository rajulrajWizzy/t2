// src/models/branch.ts
import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '@/config/database';
import { Branch, BranchAttributes } from '@/types/branch';

// Interface for creation attributes
interface BranchCreationAttributes extends Optional<BranchAttributes, 'id' | 'created_at' | 'updated_at' | 'images' | 'amenities' | 'short_code'> {}

// Define the Branch model
class BranchModel extends Model<Branch, BranchCreationAttributes> implements Branch {
  declare id: number;
  declare name: string;
  declare address: string;
  declare location: string;
  declare latitude: number | null;
  declare longitude: number | null;
  declare cost_multiplier: number;
  declare opening_time: string;
  declare closing_time: string;
  declare is_active: boolean;
  declare images: object | null;
  declare amenities: object | null;
  declare short_code: string;
  declare created_at: Date;
  declare updated_at: Date;

  // Generate a unique short code based on branch name
  public static generateShortCode(name: string): string {
    // Extract first 3 characters of name and convert to uppercase
    const prefix = name
      .replace(/[^a-zA-Z0-9]/g, '') // Remove non-alphanumeric
      .substring(0, 3)
      .toUpperCase();
    
    // Generate random suffix (3 characters)
    const randomChars = Math.random().toString(36).substring(2, 5).toUpperCase();
    
    return `${prefix}${randomChars}`;
  }
}

BranchModel.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    location: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    latitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: true,
    },
    longitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: true,
    },
    cost_multiplier: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: false,
      defaultValue: 1.00,
    },
    opening_time: {
      type: DataTypes.TIME,
      allowNull: false,
      defaultValue: '08:00:00',
    },
    closing_time: {
      type: DataTypes.TIME,
      allowNull: false,
      defaultValue: '22:00:00',
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    images: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    amenities: {
      type: DataTypes.JSONB,
      allowNull: true,
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
    tableName: 'branches',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    hooks: {
      beforeValidate: (branch: BranchModel) => {
        // Generate short_code if not provided
        if (!branch.short_code) {
          branch.short_code = BranchModel.generateShortCode(branch.name);
        }
      }
    }
  }
);

export default BranchModel;