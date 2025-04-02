import { Model, DataTypes } from 'sequelize';
import sequelize from '@/config/database';

class PaymentLogModel extends Model {
  declare id: number;
  declare booking_id: number;
  declare booking_type: string;
  declare payment_id: string;
  declare order_id: string;
  declare transaction_id: string;
  declare amount: number;
  declare currency: string;
  declare status: string;
  declare payment_method: string;
  declare refund_id: string;
  declare refund_amount: number;
  declare refund_status: string;
  declare notes: object;
  declare metadata: object;
  declare created_at: Date;
  declare updated_at: Date;
}

PaymentLogModel.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    booking_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    booking_type: {
      type: DataTypes.STRING(10),
      allowNull: false,
      validate: {
        isIn: [['seat', 'meeting']],
      },
    },
    payment_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    order_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    transaction_id: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: 'INR',
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'created',
      validate: {
        isIn: [['created', 'authorized', 'captured', 'refunded', 'failed']],
      },
    },
    payment_method: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    refund_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    refund_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    refund_status: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    notes: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSONB,
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
    modelName: 'PaymentLog',
    tableName: 'payment_logs',
    timestamps: true,
    underscored: true,
  }
);

export default PaymentLogModel; 