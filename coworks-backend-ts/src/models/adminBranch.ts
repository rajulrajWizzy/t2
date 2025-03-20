import { Model, DataTypes } from 'sequelize';
import sequelize from '@/config/database';

class AdminBranchModel extends Model {
  declare id: number;
  declare admin_id: number;
  declare branch_id: number;
  declare is_primary: boolean;
  declare created_at: Date;
  declare updated_at: Date;
}

AdminBranchModel.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    admin_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'admin_users',
        key: 'id',
      },
    },
    branch_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'branches',
        key: 'id',
      },
    },
    is_primary: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
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
    modelName: 'AdminBranch',
    tableName: 'admin_branches',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['admin_id', 'branch_id'],
        name: 'admin_branch_unique',
      },
      {
        fields: ['admin_id'],
        name: 'admin_branch_admin_idx',
      },
      {
        fields: ['branch_id'],
        name: 'admin_branch_branch_idx',
      },
    ],
  }
);

export default AdminBranchModel; 