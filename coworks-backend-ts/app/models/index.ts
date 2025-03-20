import sequelize from '@/config/database';
import SupportTicketModel from './SupportTicket';
import SupportTicketMessageModel from './SupportTicketMessage';

// Export models
const models = {
  sequelize,
  SupportTicket: SupportTicketModel,
  SupportTicketMessage: SupportTicketMessageModel
};

export default models; 