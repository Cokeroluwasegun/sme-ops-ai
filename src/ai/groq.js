require('dotenv').config();
const Groq = require('groq-sdk');
const { SYSTEM_PROMPT, INTENT_CLASSIFIER } = require('./prompts');

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

class AIService {
    async classifyIntent(message) {
        try {
            const response = await groq.chat.completions.create({
                model: 'llama-3.3-70b-versatile',
                messages: [
                    {
                        role: 'user',
                        content: `${INTENT_CLASSIFIER}\n\nUser message: "${message}"`
                    }
                ],
                temperature: 0.1,
                max_tokens: 50
            });

            return response.choices[0].message.content.trim();
        } catch (error) {
            console.error('Intent classification error:', error.message);
            return 'UNCLEAR';
        }
    }

    async chat(message, conversationHistory = [], context = {}) {
        try {
            // Build context string
            let contextStr = '';
            if (context.recentInvoices?.length > 0) {
                contextStr += '\n\nRecent invoices:\n';
                context.recentInvoices.forEach(inv => {
                    contextStr += `- ${inv.invoice_number}: ₦${inv.amount} to ${inv.customer_name} (${inv.status})\n`;
                });
            }

            if (context.customers?.length > 0) {
                contextStr += '\n\nCustomers:\n';
                context.customers.forEach(c => {
                    contextStr += `- ${c.name} (${c.phone})\n`;
                });
            }

            // Build message history
            const messages = [
                {
                    role: 'system',
                    content: SYSTEM_PROMPT + contextStr
                }
            ];

            // Add conversation history
            conversationHistory.forEach(msg => {
                messages.push({
                    role: msg.role === 'assistant' ? 'assistant' : 'user',
                    content: msg.message
                });
            });

            // Add current message
            messages.push({
                role: 'user',
                content: message
            });

            const response = await groq.chat.completions.create({
                model: 'llama-3.3-70b-versatile',
                messages: messages,
                temperature: 0.7,
                max_tokens: 1024
            });

            return response.choices[0].message.content;
        } catch (error) {
            console.error('AI chat error:', error.message);
            return "Sorry, I'm having trouble processing that. Please try again.";
        }
    }

    async extractInvoiceData(message, context = {}) {
        try {
            const prompt = `Extract invoice information from this message. Return ONLY valid JSON with this structure:
{
  "customer_name": "string",
  "amount": number,
  "items": [{"description": "string", "amount": number}],
  "due_date": "YYYY-MM-DD or null",
  "notes": "string or null"
}

If information is missing, use null. Be flexible with Nigerian English and informal language.

${context.customers ? `\nKnown customers: ${context.customers.map(c => c.name).join(', ')}` : ''}

Message: "${message}"

Return ONLY the JSON, no explanation.`;

            const response = await groq.chat.completions.create({
                model: 'llama-3.3-70b-versatile',
                messages: [
                    { role: 'user', content: prompt }
                ],
                temperature: 0.1,
                max_tokens: 500
            });

            const text = response.choices[0].message.content.trim();
            // Remove markdown code blocks if present
            const jsonStr = text.replace(/```json\n?|\n?```/g, '');
            return JSON.parse(jsonStr);
        } catch (error) {
            console.error('Invoice extraction error:', error.message);
            return null;
        }
    }
}

module.exports = new AIService();