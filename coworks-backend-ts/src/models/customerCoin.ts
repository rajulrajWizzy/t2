import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '@/config/database';

interface CustomerCoinAttributes {
  id: number;
  customer_id: number;
  balance: number;
  is_daily_pass: boolean;
  last_updated: Date;
  created_at: Date;
  updated_at: Date;
}

// Define optional attributes for creation
interface CustomerCoinCreationAttributes extends Optional<CustomerCoinAttributes, 'id' | 'created_at' | 'updated_at'> {}

// Define the CustomerCoin model
class CustomerCoinModel extends Model<CustomerCoinAttributes, CustomerCoinCreationAttributes> implements CustomerCoinAttributes {
  declare id: number;
  declare customer_id: number;
  declare balance: number;
  declare is_daily_pass: boolean;
  declare last_updated: Date;
  declare created_at: Date;
  declare updated_at: Date;
}

CustomerCoinModel.init(
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
        key: 'id'
      }
    },
    balance: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    is_daily_pass: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    last_updated: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
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
    }
  },
  {
    sequelize,
    modelName: 'CustomerCoin',
    tableName: 'customer_coins',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
);

export default CustomerCoinModel; 