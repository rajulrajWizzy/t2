import { Request, Response, NextFunction } from "express";
import SupportTicketService from '../services/SupportTicketService';
import { AuthenticatedRequest } from '@/middleware/auth';
import { ValidationError } from '@/utils/errors';

class SupportTicketController {
  // Create a new support ticket
  async createTicket(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { 
        branch_id, 
        branch_code, 
        booking_id, 
        seating_type_id,
        category, 
        title, 
        description, 
        priority 
      } = req.body;

      // Customer ID comes from authenticated user
      const customer_id = req.user.id;

      // Validate required fields
      if (!category || !title || !description) {
        throw new ValidationError('Category, title and description are required');
      }

      const ticket = await SupportTicketService.createTicket({
        customer_id,
        branch_id,
        branch_code,
        booking_id,
        seating_type_id,
        category,
        title,
        description,
        priority
      });

      res.status(201).json({
        success: true,
        message: 'Support ticket created successfully',
        data: ticket
      });
    } catch (error) {
      next(error);
    }
  }

  // Get ticket by ID
  async getTicket(req: Request, res: Response, next: NextFunction) {
    try {
      const ticketId = parseInt(req.params.id);
      const includeMessages = req.query.messages === 'true';
      
      if (isNaN(ticketId)) {
        throw new ValidationError('Invalid ticket ID');
      }

      const ticket = await SupportTicketService.getTicketById(ticketId, includeMessages);

      res.status(200).json({
        success: true,
        data: ticket
      });
    } catch (error) {
      next(error);
    }
  }

  // Get ticket by number
  async getTicketByNumber(req: Request, res: Response, next: NextFunction) {
    try {
      const ticketNumber = req.params.number;
      const includeMessages = req.query.messages === 'true';
      
      if (!ticketNumber) {
        throw new ValidationError('Ticket number is required');
      }

      const ticket = await SupportTicketService.getTicketByNumber(ticketNumber, includeMessages);

      res.status(200).json({
        success: true,
        data: ticket
      });
    } catch (error) {
      next(error);
    }
  }

  // Get all tickets with filtering
  async getTickets(req: Request, res: Response, next: NextFunction) {
    try {
      const { 
        customer_id, 
        branch_id, 
        branch_code, 
        status, 
        ticket_number,
        booking_id
      } = req.query;
      
      // Pagination
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

      const queryParams = {
        customer_id: customer_id ? parseInt(customer_id as string) : undefined,
        branch_id: branch_id ? parseInt(branch_id as string) : undefined,
        branch_code: branch_code as string,
        status: status as string,
        ticket_number: ticket_number as string,
        booking_id: booking_id ? parseInt(booking_id as string) : undefined,
        limit,
        offset
      };

      const { tickets, count } = await SupportTicketService.getTickets(queryParams);

      res.status(200).json({
        success: true,
        data: tickets,
        pagination: {
          total: count,
          limit,
          offset,
          hasMore: offset + limit < count
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Get tickets for authenticated customer
  async getMyTickets(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      // Pagination
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      
      // Status filter
      const status = req.query.status as string;
      
      const queryParams = {
        customer_id: req.user.id,
        status,
        limit,
        offset
      };

      const { tickets, count } = await SupportTicketService.getTickets(queryParams);

      res.status(200).json({
        success: true,
        data: tickets,
        pagination: {
          total: count,
          limit,
          offset,
          hasMore: offset + limit < count
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Update ticket
  async updateTicket(req: Request, res: Response, next: NextFunction) {
    try {
      const ticketId = parseInt(req.params.id);
      
      if (isNaN(ticketId)) {
        throw new ValidationError('Invalid ticket ID');
      }

      const { status, priority, title, description } = req.body;

      const ticket = await SupportTicketService.updateTicket(ticketId, {
        status,
        priority,
        title,
        description
      });

      res.status(200).json({
        success: true,
        message: 'Support ticket updated successfully',
        data: ticket
      });
    } catch (error) {
      next(error);
    }
  }

  // Add message to ticket
  async addMessage(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const ticketId = parseInt(req.params.id);
      
      if (isNaN(ticketId)) {
        throw new ValidationError('Invalid ticket ID');
      }

      const { message } = req.body;
      
      if (!message) {
        throw new ValidationError('Message is required');
      }

      // Determine sender type based on user role
      const sender_type = req.user.role === 'admin' ? 'ADMIN' : 'CUSTOMER';

      const ticketMessage = await SupportTicketService.addTicketMessage({
        ticket_id: ticketId,
        sender_type,
        sender_id: req.user.id,
        message
      });

      res.status(201).json({
        success: true,
        message: 'Message added successfully',
        data: ticketMessage
      });
    } catch (error) {
      next(error);
    }
  }

  // Get messages for a ticket
  async getMessages(req: Request, res: Response, next: NextFunction) {
    try {
      const ticketId = parseInt(req.params.id);
      
      if (isNaN(ticketId)) {
        throw new ValidationError('Invalid ticket ID');
      }

      const messages = await SupportTicketService.getTicketMessages(ticketId);

      res.status(200).json({
        success: true,
        data: messages
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new SupportTicketController();
