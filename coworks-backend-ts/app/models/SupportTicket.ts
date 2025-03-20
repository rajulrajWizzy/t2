import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '@/config/database';
import Customer from '@/models/customer';
import Branch from '@/models/branch';
import SeatBooking from '@/models/seatBooking';
import SeatingType from '@/models/seatingType';

export interface SupportTicketAttributes {
  id: number;
  ticket_number: string;
  customer_id: number;
  branch_id?: number | null;
  branch_code?: string | null;
  booking_id?: number | null;
  seating_type_id?: number | null;
  category: string;
  title: string;
  description: string;
  status: 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | 'REOPENED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  created_at: Date;
  updated_at: Date;
  closed_at?: Date | null;
  reopened_at?: Date | null;
}

export interface SupportTicketCreationAttributes extends Optional<SupportTicketAttributes, 'id' | 'created_at' | 'updated_at' | 'status' | 'priority' | 'closed_at' | 'reopened_at'> {}

class SupportTicket extends Model<SupportTicketAttributes, SupportTicketCreationAttributes> implements SupportTicketAttributes {
  public id!: number;
  public ticket_number!: string;
  public customer_id!: number;
  public branch_id?: number | null;
  public branch_code?: string | null;
  public booking_id?: number | null;
  public seating_type_id?: number | null;
  public category!: string;
  public title!: string;
  public description!: string;
  public status!: 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | 'REOPENED';
  public priority!: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  public created_at!: Date;
  public updated_at!: Date;
  public closed_at?: Date | null;
  public reopened_at?: Date | null;

  // Associations
  public readonly customer?: Customer;
  public readonly branch?: Branch;
  public readonly booking?: SeatBooking;
  public readonly seatingType?: SeatingType;
}

SupportTicket.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  ticket_number: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
  },
  customer_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'customers',
      key: 'id',
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
  branch_code: {
    type: DataTypes.STRING(10),
    allowNull: true,
  },
  booking_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'seat_bookings',
      key: 'id',
    },
  },
  seating_type_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'seating_types',
      key: 'id',
    },
  },
  category: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  status: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'ASSIGNED',
  },
  priority: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'MEDIUM',
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
  closed_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  reopened_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  sequelize,
  modelName: 'SupportTicket',
  tableName: 'support_tickets',
  timestamps: false,
});

// Define associations
SupportTicket.belongsTo(Customer, { foreignKey: 'customer_id' });
SupportTicket.belongsTo(Branch, { foreignKey: 'branch_id' });
SupportTicket.belongsTo(SeatBooking, { foreignKey: 'booking_id' });
SupportTicket.belongsTo(SeatingType, { foreignKey: 'seating_type_id' });

export default SupportTicket; 