const db = require('../db/queries');
const ai = require('../ai/groq');

class InvoiceService {
  async createInvoice(tenantId, message, context) {
    try {
      // Check usage limits
      const limitCheck = await db.checkLimit(tenantId, 'invoice');
      if (!limitCheck.allowed) {
        return {
          success: false,
          message: limitCheck.message
        };
      }

      // Extract invoice data using AI
      const invoiceData = await ai.extractInvoiceData(message, context);

      if (!invoiceData || !invoiceData.customer_name || !invoiceData.amount) {
        return {
          success: false,
          message: "I need more information to create the invoice. Please provide:\n• Customer name\n• Amount\n• Items/services (optional)\n\nExample: 'Invoice for John, ₦50,000 for web design'"
        };
      }

      // Find or create customer
      let customer = context.customers?.find(
        c => c.name.toLowerCase() === invoiceData.customer_name.toLowerCase()
      );

      if (!customer) {
        customer = await db.createCustomer(
          tenantId,
          invoiceData.customer_name,
          null // Phone will be added later if needed
        );
      }

      // Generate invoice number
      const invoiceNumber = await db.getNextInvoiceNumber(tenantId);

      // Create invoice
      const invoice = await db.createInvoice(tenantId, {
        customer_id: customer.id,
        invoice_number: invoiceNumber,
        amount: invoiceData.amount,
        items: invoiceData.items || [],
        notes: invoiceData.notes,
        due_date: invoiceData.due_date
      });

      // Track usage
      await db.incrementUsage(tenantId, 'invoice');

      // Add customer name to invoice object
      invoice.customer_name = customer.name;

      return {
        success: true,
        invoice: invoice
      };
    } catch (error) {
      console.error('Invoice creation error:', error);
      return {
        success: false,
        message: 'Sorry, I had trouble creating that invoice. Please try again.'
      };
    }
  }

  async getInvoices(tenantId, limit = 10) {
    return await db.getInvoices(tenantId, limit);
  }

  async getInvoiceStats(tenantId) {
    const invoices = await db.getInvoices(tenantId, 100);

    const stats = {
      total: invoices.length,
      pending: invoices.filter(i => i.status === 'pending').length,
      paid: invoices.filter(i => i.status === 'paid').length,
      draft: invoices.filter(i => i.status === 'draft').length,
      totalAmount: invoices.reduce((sum, i) => sum + parseFloat(i.amount), 0),
      paidAmount: invoices
        .filter(i => i.status === 'paid')
        .reduce((sum, i) => sum + parseFloat(i.amount), 0)
    };

    return stats;
  }
}

module.exports = new InvoiceService();