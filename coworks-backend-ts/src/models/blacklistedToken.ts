import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '@/config/database';

interface BlacklistedTokenAttributes {
  id: number;
  token: string;
  user_id?: number | null;
  token_id?: string | null;
  blacklisted_at: Date;
  expires_at: Date;
  created_at: Date;
  updated_at: Date;
}

// Interface for creation attributes
interface BlacklistedTokenCreationAttributes extends Optional<BlacklistedTokenAttributes, 'id' | 'created_at' | 'updated_at'> {}

// Define the BlacklistedToken model
class BlacklistedTokenModel extends Model<BlacklistedTokenAttributes, BlacklistedTokenCreationAttributes> implements BlacklistedTokenAttributes {
  public id!: number;
  public token!: string;
  public user_id?: number | null;
  public token_id?: string | null;
  public blacklisted_at!: Date;
  public expires_at!: Date;
  public created_at!: Date;
  public updated_at!: Date;
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
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    token_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    blacklisted_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
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
    tableName: 'blacklisted_tokens',
    sequelize,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        name: 'idx_blacklisted_tokens_token_id',
        fields: ['token_id'],
      },
      {
        name: 'idx_blacklisted_tokens_user_id',
        fields: ['user_id'],
      }
    ]
  }
);

export default BlacklistedTokenModel;