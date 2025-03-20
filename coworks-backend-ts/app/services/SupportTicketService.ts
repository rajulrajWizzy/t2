import SupportTicket from '../models/SupportTicket';
import SupportTicketMessage from '../models/SupportTicketMessage';
import Customer from '@/models/customer';
import Branch from '@/models/branch';
import SeatBooking from '@/models/seatBooking';
import SeatingType from '@/models/seatingType';
import { Op } from 'sequelize';
import { NotFoundError, ValidationError } from '@/utils/errors';
import { v4 as uuidv4 } from 'uuid';

export interface CreateTicketParams {
  customer_id: number;
  branch_id?: number | null;
  branch_code?: string | null;
  booking_id?: number | null;
  seating_type_id?: number | null;
  category: string;
  title: string;
  description: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
}

export interface UpdateTicketParams {
  status?: 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | 'REOPENED';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  title?: string;
  description?: string;
}

export interface TicketMessageParams {
  ticket_id: number;
  sender_type: 'CUSTOMER' | 'ADMIN' | 'SYSTEM';
  sender_id?: number | null;
  message: string;
}

export interface TicketQueryParams {
  customer_id?: number;
  branch_id?: number;
  branch_code?: string;
  status?: string;
  ticket_number?: string;
  booking_id?: number;
  limit?: number;
  offset?: number;
}

class SupportTicketService {
  // Generate a unique ticket number
  private generateTicketNumber(): string {
    // Format: TKT-{random 6 chars}-{timestamp}
    const randomChars = uuidv4().substring(0, 6).toUpperCase();
    const timestamp = Date.now().toString().substring(6); // Last 7 digits of timestamp
    return `TKT-${randomChars}-${timestamp}`;
  }

  // Create a new support ticket
  async createTicket(data: CreateTicketParams): Promise<SupportTicket> {
    const ticketNumber = this.generateTicketNumber();
    
    const ticket = await SupportTicket.create({
      ...data,
      ticket_number: ticketNumber,
      status: 'OPEN'
    });

    // Create initial system message
    await SupportTicketMessage.create({
      ticket_id: ticket.id,
      sender_type: 'SYSTEM',
      message: 'Ticket created and assigned to support team.'
    });

    return ticket;
  }

  // Get ticket by ID with optional include of messages
  async getTicketById(id: number, includeMessages: boolean = false): Promise<SupportTicket> {
    const include = [];
    
    // Include associations
    include.push(
      { model: Customer, as: 'customer' },
      { model: Branch, as: 'branch' }
    );

    if (includeMessages) {
      include.push({
        model: SupportTicketMessage,
        as: 'messages',
        order: [['created_at', 'ASC']]
      });
    }

    const ticket = await SupportTicket.findByPk(id, { include });
    
    if (!ticket) {
      throw new NotFoundError('Support ticket not found');
    }
    
    return ticket;
  }

  // Get ticket by ticket number
  async getTicketByNumber(ticketNumber: string, includeMessages: boolean = false): Promise<SupportTicket> {
    const include = [];
    
    // Include associations
    include.push(
      { model: Customer, as: 'customer' },
      { model: Branch, as: 'branch' }
    );

    if (includeMessages) {
      include.push({
        model: SupportTicketMessage,
        as: 'messages',
        order: [['created_at', 'ASC']]
      });
    }

    const ticket = await SupportTicket.findOne({ 
      where: { ticket_number: ticketNumber },
      include
    });
    
    if (!ticket) {
      throw new NotFoundError('Support ticket not found');
    }
    
    return ticket;
  }

  // Get all tickets with filtering
  async getTickets(params: TicketQueryParams): Promise<{ tickets: SupportTicket[], count: number }> {
    const { 
      customer_id, 
      branch_id, 
      branch_code, 
      status, 
      ticket_number,
      booking_id,
      limit = 10, 
      offset = 0 
    } = params;

    const where: any = {};

    if (customer_id) where.customer_id = customer_id;
    if (branch_id) where.branch_id = branch_id;
    if (branch_code) where.branch_code = branch_code;
    if (booking_id) where.booking_id = booking_id;
    
    if (status) {
      if (status.includes(',')) {
        where.status = { [Op.in]: status.split(',') };
      } else {
        where.status = status;
      }
    }
    
    if (ticket_number) {
      where.ticket_number = { [Op.like]: `%${ticket_number}%` };
    }

    const { rows: tickets, count } = await SupportTicket.findAndCountAll({
      where,
      limit,
      offset,
      include: [
        { model: Customer, as: 'customer' },
        { model: Branch, as: 'branch' }
      ],
      order: [['created_at', 'DESC']]
    });

    return { tickets, count };
  }

  // Update ticket
  async updateTicket(id: number, data: UpdateTicketParams): Promise<SupportTicket> {
    const ticket = await SupportTicket.findByPk(id);
    
    if (!ticket) {
      throw new NotFoundError('Support ticket not found');
    }

    // Special handling for status changes
    if (data.status && data.status !== ticket.status) {
      // Handle "CLOSED" status
      if (data.status === 'CLOSED') {
        ticket.closed_at = new Date();
      }
      
      // Handle "REOPENED" status
      if (data.status === 'REOPENED') {
        ticket.reopened_at = new Date();
      }

      // Add system message about status change
      await SupportTicketMessage.create({
        ticket_id: ticket.id,
        sender_type: 'SYSTEM',
        message: `Ticket status changed from ${ticket.status} to ${data.status}`
      });
    }

    await ticket.update(data);
    
    return ticket;
  }

  // Add message to ticket
  async addTicketMessage(data: TicketMessageParams): Promise<SupportTicketMessage> {
    // Verify ticket exists
    const ticket = await SupportTicket.findByPk(data.ticket_id);
    
    if (!ticket) {
      throw new NotFoundError('Support ticket not found');
    }

    const message = await SupportTicketMessage.create(data);
    
    // Update ticket's updated_at time
    await ticket.update({ updated_at: new Date() });
    
    return message;
  }

  // Get messages for a ticket
  async getTicketMessages(ticketId: number): Promise<SupportTicketMessage[]> {
    // Verify ticket exists
    const ticket = await SupportTicket.findByPk(ticketId);
    
    if (!ticket) {
      throw new NotFoundError('Support ticket not found');
    }

    const messages = await SupportTicketMessage.findAll({
      where: { ticket_id: ticketId },
      order: [['created_at', 'ASC']]
    });
    
    return messages;
  }
}

export default new SupportTicketService(); 