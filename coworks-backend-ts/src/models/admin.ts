import { Model, DataTypes } from 'sequelize';
import sequelize from '@/config/database';
import bcrypt from 'bcrypt';

export enum AdminRole {
  BRANCH_ADMIN = 'branch_admin',
  SUPER_ADMIN = 'super_admin'
}

class AdminModel extends Model {
  declare id: number;
  declare username: string;
  declare email: string;
  declare password: string;
  declare name: string;
  declare role: string;
  declare branch_id: number | null;
  declare is_active: boolean;
  declare last_login: Date | null;
  declare profile_picture: string | null;
  declare created_at: Date;
  declare updated_at: Date;

  // Method to validate password
  async validatePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password);
  }
}

AdminModel.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        len: [3, 50],
      },
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    role: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: AdminRole.BRANCH_ADMIN,
      validate: {
        isIn: [Object.values(AdminRole)],
      },
    },
    branch_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'branches',
        key: 'id',
      },
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    last_login: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    profile_picture: {
      type: DataTypes.STRING,
      allowNull: true,
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
    modelName: 'Admin',
    tableName: 'admin_users',
    timestamps: true,
    underscored: true,
    hooks: {
      beforeCreate: async (admin: AdminModel) => {
        if (admin.password) {
          const salt = await bcrypt.genSalt(10);
          admin.password = await bcrypt.hash(admin.password, salt);
        }
      },
      beforeUpdate: async (admin: AdminModel) => {
        if (admin.changed('password')) {
          const salt = await bcrypt.genSalt(10);
          admin.password = await bcrypt.hash(admin.password, salt);
        }
      },
    },
  }
);

export default AdminModel; 