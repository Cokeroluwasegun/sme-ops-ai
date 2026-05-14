const db = require('../db/queries');
const ai = require('../ai/groq');
const invoiceService = require('../services/invoice.service');
const customerService = require('../services/customer.service');
const contextService = require('../services/context.service');

class MessageHandler {
  async handle(msg, whatsappClient) {
    const phone = whatsappClient.getPhoneNumber(msg);
    const message = msg.body.trim();

    console.log(`\n🔄 Processing: "${message}" from ${phone}`);

    try {
      let tenant = await db.getTenant(phone);


      if (!tenant) {
        tenant = await db.createTenant('New Business', phone);

        await this.sendWelcomeMessage(
          msg,
          whatsappClient,
          tenant
        );

        await db.trackEvent(
          tenant.id,
          phone,
          'user.first_message',
          { message }
        );

        return;
      }

      const context = await contextService.buildContext(
        tenant.id,
        phone
      );

      await db.saveMessage(
        tenant.id,
        phone,
        message,
        'user'
      );

      let intent = 'GENERAL_CHAT';

      try {
        intent = await ai.classifyIntent(message);
      } catch (intentError) {
        console.error(
          'Intent classification error:',
          intentError
        );
      }

      console.log(`🎯 Intent: ${intent}`);

      let response = '';

      switch (intent) {
        case 'CREATE_INVOICE':
          response = await this.handleCreateInvoice(
            tenant,
            phone,
            message,
            context,
            msg,
            whatsappClient
          );
          break;

        case 'VIEW_INVOICES':
          response = await this.handleViewInvoices(
            tenant,
            phone,
            msg,
            whatsappClient
          );
          break;

        case 'ADD_CUSTOMER':
          response = await this.handleAddCustomer(
            tenant,
            phone,
            message
          );
          break;

        case 'VIEW_CUSTOMERS':
          response = await this.handleViewCustomers(
            tenant,
            phone,
            msg,
            whatsappClient
          );
          break;

        case 'GET_HELP':
          response = await this.handleHelp(
            tenant,
            phone
          );
          break;

        case 'GENERAL_CHAT':
        case 'UNCLEAR':
        default:
          response = await this.handleGeneralChat(
            tenant,
            phone,
            message,
            context
          );
          break;
      }

      response = String(response || '').trim();

      if (!response) {
        response =
          'Sorry, I could not process your request.';
      }

      console.log('📤 Sending message...');
      console.log('📱 Phone:', phone);
      console.log('📝 Response:', response);

      const chat = await msg.getChat();

      await new Promise((resolve) =>
        setTimeout(resolve, 1000)
      );

      await chat.sendMessage(response);

      await db.saveMessage(
        tenant.id,
        phone,
        response,
        'assistant'
      );

      await db.incrementUsage(
        tenant.id,
        'ai_message'
      );


    } catch (error) {
      console.error(
        'Message handling error:',
        error
      );


      try {
        const chat = await msg.getChat();

        await chat.sendMessage(
          'Sorry, I encountered an error. Please try again later.'
        );

      } catch (sendError) {
        console.error(
          'Failed to send error message:',
          sendError
        );
      }


    }
  }


  async sendWelcomeMessage(msg, whatsappClient, tenant) {
    const welcome = `👋 Welcome to ${process.env.BUSINESS_NAME}!

I'm your AI assistant for managing invoices, customers, and payments.

Here's what I can help you with:
- Create invoices
- Track customers
- View your invoices
- Send payment reminders

Try saying:
"Create invoice for John, ₦50,000 for website design"
or
"Show me my invoices"

What would you like to do?`;

    await whatsappClient.sendMessage(msg, welcome);
  }

  async handleCreateInvoice(tenant, phone, message, context, msg, whatsappClient) {
    console.log('📄 Creating invoice...');

    const result = await invoiceService.createInvoice(tenant.id, message, context);

    if (!result.success) {
      await db.trackEvent(tenant.id, phone, 'invoice.creation_failed', { message });
      return result.message;
    }

    await db.trackEvent(tenant.id, phone, 'invoice.created', {
      invoice_number: result.invoice.invoice_number,
      amount: result.invoice.amount
    });

    await whatsappClient.sendInvoice(msg, result.invoice);

    const limitCheck = await db.checkLimit(tenant.id, 'invoice');
    if (limitCheck.remaining !== undefined && limitCheck.remaining <= 3) {
      return `\n⚠️ You have ${limitCheck.remaining} invoices remaining this month. Upgrade to create unlimited invoices.`;
    }

    return null;
  }

  async handleViewInvoices(tenant, phone, msg, whatsappClient) {
    console.log('📊 Fetching invoices...');

    const invoices = await invoiceService.getInvoices(tenant.id);

    await db.trackEvent(tenant.id, phone, 'invoices.viewed', {
      count: invoices.length
    });

    return whatsappClient.formatInvoiceList(invoices);
  }

  async handleAddCustomer(tenant, phone, message) {
    console.log('👤 Adding customer...');

    const nameMatch = message.match(/add customer (.+)/i) ||
      message.match(/new customer (.+)/i) ||
      message.match(/customer (.+)/i);

    if (!nameMatch) {
      return "Please provide the customer name. Example: 'Add customer John Doe'";
    }

    const customerName = nameMatch[1].trim();
    const result = await customerService.addCustomer(tenant.id, customerName);

    if (!result.success) {
      return result.message;
    }

    await db.trackEvent(tenant.id, phone, 'customer.added', {
      name: customerName
    });

    return `✅ Added ${customerName} to your customer list!`;
  }

  async handleViewCustomers(tenant, phone, msg, whatsappClient) {
    console.log('👥 Fetching customers...');

    const customers = await customerService.getCustomers(tenant.id);

    await db.trackEvent(tenant.id, phone, 'customers.viewed', {
      count: customers.length
    });

    return whatsappClient.formatCustomerList(customers);
  }

  async handleHelp(tenant, phone) {
    await db.trackEvent(tenant.id, phone, 'help.requested');

    return `📖 *Help Guide*

*Creating Invoices:*
"Invoice for John, ₦50,000 for web design"
"Create invoice: ₦25,000 to Sarah, due next week"

*Managing Customers:*
"Add customer John Doe"
"Show my customers"

*Viewing Data:*
"Show me my invoices"
"List all customers"

*Tips:*
- Be conversational - I understand natural language
- Include customer name and amount for invoices
- You can track payment by saying "John paid me"

Need more help? Just ask!`;
  }

  async handleGeneralChat(tenant, phone, message, context) {
    console.log('💬 General conversation...');

    const response = await ai.chat(message, context.conversationHistory, {
      recentInvoices: context.recentInvoices,
      customers: context.customers
    });

    await db.trackEvent(tenant.id, phone, 'message.general', { message });

    return response;
  }
}

module.exports = new MessageHandler();