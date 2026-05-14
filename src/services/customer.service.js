const db = require('../db/queries');

class CustomerService {
  async addCustomer(tenantId, name, phone = null, email = null) {
    try {
      const customer = await db.createCustomer(tenantId, name, phone, email);
      return {
        success: true,
        customer: customer
      };
    } catch (error) {
      console.error('Customer creation error:', error);
      return {
        success: false,
        message: 'Sorry, I had trouble adding that customer. Please try again.'
      };
    }
  }

  async getCustomers(tenantId) {
    return await db.getCustomers(tenantId);
  }

  async findCustomer(tenantId, searchTerm) {
    const customers = await db.getCustomers(tenantId);
    return customers.find(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.phone && c.phone.includes(searchTerm))
    );
  }
}

module.exports = new CustomerService();