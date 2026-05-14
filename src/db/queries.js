const { pool } = require('./connection');

class Database {
    // Tenants
    async createTenant(businessName, phone) {
        const result = await pool.query(
            `INSERT INTO tenants (business_name, phone) 
       VALUES ($1, $2) 
       ON CONFLICT (phone) DO UPDATE SET business_name = EXCLUDED.business_name
       RETURNING *`,
            [businessName, phone]
        );
        return result.rows[0];
    }

    async getTenant(phone) {
        const result = await pool.query(
            'SELECT * FROM tenants WHERE phone = $1',
            [phone]
        );
        return result.rows[0];
    }

    // Customers
    async createCustomer(tenantId, name, phone, email = null) {
        const result = await pool.query(
            `INSERT INTO customers (tenant_id, name, phone, email) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
            [tenantId, name, phone, email]
        );
        return result.rows[0];
    }

    async getCustomers(tenantId, limit = 50) {
        const result = await pool.query(
            `SELECT * FROM customers 
       WHERE tenant_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2`,
            [tenantId, limit]
        );
        return result.rows;
    }

    // Invoices
    async createInvoice(tenantId, invoiceData) {
        const { customer_id, invoice_number, amount, items, notes, due_date } = invoiceData;

        const result = await pool.query(
            `INSERT INTO invoices (tenant_id, customer_id, invoice_number, amount, items, notes, due_date, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending') 
       RETURNING *`,
            [tenantId, customer_id, invoice_number, amount, JSON.stringify(items), notes, due_date]
        );
        return result.rows[0];
    }

    async getInvoices(tenantId, limit = 20) {
        const result = await pool.query(
            `SELECT i.*, c.name as customer_name, c.phone as customer_phone
       FROM invoices i
       LEFT JOIN customers c ON i.customer_id = c.id
       WHERE i.tenant_id = $1 
       ORDER BY i.created_at DESC 
       LIMIT $2`,
            [tenantId, limit]
        );
        return result.rows;
    }

    async getNextInvoiceNumber(tenantId) {
        const result = await pool.query(
            `SELECT invoice_number FROM invoices 
       WHERE tenant_id = $1 
       ORDER BY created_at DESC 
       LIMIT 1`,
            [tenantId]
        );

        if (result.rows.length === 0) {
            return 'INV-001';
        }

        const lastNumber = result.rows[0].invoice_number;
        const match = lastNumber.match(/INV-(\d+)/);
        if (match) {
            const nextNum = parseInt(match[1]) + 1;
            return `INV-${String(nextNum).padStart(3, '0')}`;
        }
        return 'INV-001';
    }

    // Conversations
    async saveMessage(tenantId, phone, message, role) {
        await pool.query(
            `INSERT INTO conversations (tenant_id, user_phone, message, role) 
       VALUES ($1, $2, $3, $4)`,
            [tenantId, phone, message, role]
        );
    }

    async getConversationHistory(tenantId, phone, limit = 10) {
        const result = await pool.query(
            `SELECT message, role, created_at 
       FROM conversations 
       WHERE tenant_id = $1 AND user_phone = $2 
       ORDER BY created_at DESC 
       LIMIT $3`,
            [tenantId, phone, limit]
        );
        return result.rows.reverse(); // Return in chronological order
    }

    // Events
    async trackEvent(tenantId, phone, eventType, eventData = {}) {
        await pool.query(
            `INSERT INTO events (tenant_id, user_phone, event_type, event_data) 
       VALUES ($1, $2, $3, $4)`,
            [tenantId, phone, eventType, JSON.stringify(eventData)]
        );
    }

    // Usage tracking
    async incrementUsage(tenantId, resourceType) {
        await pool.query(
            `INSERT INTO usage (tenant_id, resource_type, count, period) 
       VALUES ($1, $2, 1, CURRENT_DATE)
       ON CONFLICT (tenant_id, resource_type, period) 
       DO UPDATE SET count = usage.count + 1`,
            [tenantId, resourceType]
        );
    }

    async getUsage(tenantId, resourceType, period = 'month') {
        const result = await pool.query(
            `SELECT SUM(count) as total 
       FROM usage 
       WHERE tenant_id = $1 
         AND resource_type = $2 
         AND period >= DATE_TRUNC($3, CURRENT_DATE)`,
            [tenantId, resourceType, period]
        );
        return parseInt(result.rows[0]?.total || 0);
    }

    async checkLimit(tenantId, resourceType) {
        const tenant = await pool.query(
            'SELECT plan, monthly_limit_invoices FROM tenants WHERE id = $1',
            [tenantId]
        );

        if (!tenant.rows[0] || tenant.rows[0].plan !== 'free') {
            return { allowed: true };
        }

        const usage = await this.getUsage(tenantId, resourceType, 'month');
        const limit = tenant.rows[0].monthly_limit_invoices;

        if (usage >= limit) {
            return {
                allowed: false,
                message: `You've reached your limit of ${limit} ${resourceType}s this month. Upgrade to continue.`
            };
        }

        return { allowed: true, remaining: limit - usage };
    }
}

module.exports = new Database();