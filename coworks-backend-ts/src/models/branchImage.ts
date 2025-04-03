import { Model, DataTypes } from 'sequelize';
import sequelize from '@/config/database';

class BranchImageModel extends Model {
  declare id: number;
  declare branch_id: number;
  declare image_url: string;
  declare is_primary: boolean;
  declare seating_type: string;
  declare created_at: Date;
  declare updated_at: Date;
}

BranchImageModel.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    branch_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'branches', 
        key: 'id'
      }
    },
    image_url: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    is_primary: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    seating_type: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'DEFAULT',
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
    modelName: 'BranchImage',
    tableName: 'branch_images',
    timestamps: true,
    underscored: true,
  }
);

export default BranchImageModel; 