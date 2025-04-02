import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '@/config/database';

interface BlacklistedTokenAttributes {
  id: number;
  token: string;
  expires_at: Date;
  created_at: Date;
  blacklisted_at?: Date;
}

// Interface for creation attributes
interface BlacklistedTokenCreationAttributes extends Optional<BlacklistedTokenAttributes, 'id' | 'created_at' | 'blacklisted_at'> {}

// Define the BlacklistedToken model
class BlacklistedTokenModel extends Model<BlacklistedTokenAttributes, BlacklistedTokenCreationAttributes> implements BlacklistedTokenAttributes {
  public id!: number;
  public token!: string;
  public expires_at!: Date;
  public created_at!: Date;
  public blacklisted_at?: Date;
}

BlacklistedTokenModel.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    token: {
      type: DataTypes.TEXT,
      allowNull: false,
      unique: true,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    blacklisted_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    }
  },
  {
    tableName: 'blacklisted_tokens',
    schema: 'excel_coworks_schema',
    sequelize,
    timestamps: false, // We're manually handling timestamps
    createdAt: 'created_at',
    updatedAt: false, // No updatedAt field
  }
);

export default BlacklistedTokenModel;