import { Router } from 'express';
import SupportTicketController from '../controllers/SupportTicketController';
import { authenticateJWT, authorizeRoles } from '@/middleware/auth';

const router = Router();

// Customer routes
router.post(
  '/',
  authenticateJWT,
  SupportTicketController.createTicket
);

router.get(
  '/my-tickets',
  authenticateJWT,
  SupportTicketController.getMyTickets
);

router.post(
  '/:id/messages',
  authenticateJWT,
  SupportTicketController.addMessage
);

// Admin routes
router.get(
  '/',
  authenticateJWT,
  authorizeRoles(['admin']),
  SupportTicketController.getTickets
);

router.get(
  '/:id',
  authenticateJWT,
  SupportTicketController.getTicket
);

router.get(
  '/number/:number',
  authenticateJWT,
  SupportTicketController.getTicketByNumber
);

router.put(
  '/:id',
  authenticateJWT,
  authorizeRoles(['admin']),
  SupportTicketController.updateTicket
);

router.get(
  '/:id/messages',
  authenticateJWT,
  SupportTicketController.getMessages
);

export default router; 