import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '@/config/database';
import { v4 as uuidv4 } from 'uuid'; // Import UUID generator

interface PasswordResetAttributes {
  id: number;
  customer_id: number;
  token: string;
  expires_at: Date;
  used: boolean;
  created_at: Date;
  updated_at: Date;
}

// Interface for creation attributes
interface PasswordResetCreationAttributes extends Optional<PasswordResetAttributes, 'id' | 'token' | 'created_at' | 'updated_at' | 'used'> {}

// Define the PasswordReset model
class PasswordResetModel extends Model<PasswordResetAttributes, PasswordResetCreationAttributes> implements PasswordResetAttributes {
  public id!: number;
  public customer_id!: number;
  public token!: string;
  public expires_at!: Date;
  public used!: boolean;
  public created_at!: Date;
  public updated_at!: Date;

  // Generate a new reset token
  static generateToken(): string {
    return uuidv4();
  }

  // Create expiration date (default: 1 hour from now)
  static getExpiryDate(hours = 1): Date {
    const date = new Date();
    date.setHours(date.getHours() + hours);
    return date;
  }
}

PasswordResetModel.init(
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
    token: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: () => uuidv4(),
      unique: true,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    used: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
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
    tableName: 'password_resets',
    sequelize,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

export default PasswordResetModel;