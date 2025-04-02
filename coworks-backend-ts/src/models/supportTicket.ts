import { Model, DataTypes } from 'sequelize';
import sequelize from '@/config/database';

export enum TicketStatus {
  NEW = 'new',
  ASSIGNED = 'assigned',
  IN_PROGRESS = 'in_progress',
  CLOSED = 'closed',
  REOPENED = 'reopened'
}

export enum TicketCategory {
  INTERNET_ISSUE = 'internet_issue',
  POWER_OUTAGE = 'power_outage',
  SEAT_ISSUE = 'seat_issue',
  BOOKING_PROBLEM = 'booking_problem',
  MEETING_ROOM_ISSUE = 'meeting_room_issue',
  CLEANLINESS = 'cleanliness',
  PAYMENT_ISSUE = 'payment_issue',
  OTHER = 'other'
}

class SupportTicketModel extends Model {
  declare id: number;
  declare ticket_number: string;
  declare customer_id: number;
  declare branch_id: number;
  declare branch_code: string;
  declare seating_type_id: number | null;
  declare seating_type_code: string | null;
  declare booking_id: number | null;
  declare booking_type: string | null;
  declare title: string;
  declare category: string;
  declare description: string;
  declare status: string;
  declare created_at: Date;
  declare updated_at: Date;
  declare closed_at: Date | null;
  declare reopened_at: Date | null;
  declare assigned_to: number | null;
}

SupportTicketModel.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    ticket_number: {
      type: DataTypes.STRING,
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
      allowNull: false,
      references: {
        model: 'branches',
        key: 'id',
      },
    },
    branch_code: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    seating_type_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'seating_types',
        key: 'id',
      },
    },
    seating_type_code: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    booking_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    booking_type: {
      type: DataTypes.STRING(10),
      allowNull: true,
      validate: {
        isIn: [['seat', 'meeting']],
      },
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    category: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [Object.values(TicketCategory)],
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: TicketStatus.ASSIGNED,
      validate: {
        isIn: [Object.values(TicketStatus)],
      },
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
    assigned_to: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'admin_users',
        key: 'id',
      },
    },
  },
  {
    sequelize,
    modelName: 'SupportTicket',
    tableName: 'support_tickets',
    timestamps: true,
    underscored: true,
    hooks: {
      beforeCreate: async (ticket: SupportTicketModel) => {
        // Generate ticket number: T-YYYYMMDD-XXXX (X = random alphanumeric)
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
        ticket.ticket_number = `T-${dateStr}-${randomStr}`;
      },
    },
  }
);

export default SupportTicketModel; 