import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '@/config/database';

// Interface for MaintenanceBlock attributes
interface MaintenanceBlockAttributes {
  id: string;
  seat_id: string;
  start_time: Date;
  end_time: Date;
  reason: string;
  created_at: Date;
  created_by?: string | null;
  notes?: string | null;
}

// Interface for creation attributes (optional fields on creation)
interface MaintenanceBlockCreationAttributes extends Optional<MaintenanceBlockAttributes, 'id' | 'created_at' | 'created_by' | 'notes'> {}

// Define the MaintenanceBlock model
class MaintenanceBlockModel extends Model<MaintenanceBlockAttributes, MaintenanceBlockCreationAttributes> implements MaintenanceBlockAttributes {
  declare id: string;
  declare seat_id: string;
  declare start_time: Date;
  declare end_time: Date;
  declare reason: string;
  declare created_at: Date;
  declare created_by?: string | null;
  declare notes?: string | null;
}

MaintenanceBlockModel.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    seat_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'seats',
        key: 'id',
      }
    },
    start_time: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    end_time: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    }
  },
  {
    sequelize,
    tableName: 'maintenance_blocks',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false, // No updated_at column
  }
);

export default MaintenanceBlockModel; 