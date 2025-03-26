import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../db/config';

// Interface for ResetToken attributes
interface ResetTokenAttributes {
  id: number;
  token: string;
  user_id: number;
  user_type: string;
  expires_at: Date;
  is_used: boolean;
  created_at?: Date;
  updated_at?: Date;
}

// Interface for creation attributes (optional id)
interface ResetTokenCreationAttributes extends Optional<ResetTokenAttributes, 'id'> {}

// Reset Token model class
export class ResetToken extends Model<ResetTokenAttributes, ResetTokenCreationAttributes> 
  implements ResetTokenAttributes {
  
  public id!: number;
  public token!: string;
  public user_id!: number;
  public user_type!: string;
  public expires_at!: Date;
  public is_used!: boolean;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
  
  // Check if token is expired
  public isExpired(): boolean {
    return new Date() > this.expires_at;
  }
  
  // Mark token as used
  public async markAsUsed(): Promise<void> {
    this.is_used = true;
    await this.save();
  }
}

// Initialize model
ResetToken.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    token: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    user_type: {
      type: DataTypes.STRING(10),
      allowNull: false,
      validate: {
        isIn: [['user', 'admin']],
      },
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    is_used: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    }
  },
  {
    sequelize,
    tableName: 'reset_tokens',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['token'] },
      { fields: ['user_id', 'user_type'] },
    ],
  }
);

export default ResetToken; 