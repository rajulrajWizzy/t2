import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '@/config/database';
import { 
  Payment, 
  PaymentAttributes, 
  PaymentMethodEnum, 
  PaymentStatusEnum, 
  BookingTypeEnum 
} from '@/types/payment';

// Interface for creation attributes
interface PaymentCreationAttributes extends Optional<PaymentAttributes, 'id' | 'created_at' | 'updated_at' | 'payment_status' | 'transaction_id'> {}

// Define the Payment model
class PaymentModel extends Model<Payment, PaymentCreationAttributes> implements Payment {
  declare id: number;
  declare booking_id: number;
  declare booking_type: BookingTypeEnum;
  declare amount: number;
  declare payment_method: PaymentMethodEnum;
  declare payment_status: PaymentStatusEnum;
  declare transaction_id: string | null;
  declare created_at: Date;
  declare updated_at: Date;

  // Add any instance methods here
}

PaymentModel.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    booking_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    booking_type: {
      type: DataTypes.ENUM(...Object.values(BookingTypeEnum)),
      allowNull: false,
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    payment_method: {
      type: DataTypes.ENUM(...Object.values(PaymentMethodEnum)),
      allowNull: false,
    },
    payment_status: {
      type: DataTypes.ENUM(...Object.values(PaymentStatusEnum)),
      defaultValue: PaymentStatusEnum.PENDING,
    },
    transaction_id: {
      type: DataTypes.STRING,
      allowNull: true,
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
    tableName: 'payments',
    sequelize,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

export default PaymentModel;