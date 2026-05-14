const db = require('../db/queries');

class ContextService {
  async buildContext(tenantId, phone) {
    try {
      // Get recent invoices
      const recentInvoices = await db.getInvoices(tenantId, 5);
      
      // Get customers
      const customers = await db.getCustomers(tenantId);
      
      // Get conversation history
      const conversationHistory = await db.getConversationHistory(tenantId, phone, 10);
      
      return {
        recentInvoices,
        customers,
        conversationHistory
      };
    } catch (error) {
      console.error('Context building error:', error);
      return {
        recentInvoices: [],
        customers: [],
        conversationHistory: []
      };
    }
  }
}

module.exports = new ContextService();