require('dotenv').config();
const WhatsAppClient = require('./whatsapp/client');
const messageHandler = require('./whatsapp/handler');

async function main() {
  console.log('🚀 Starting SME Ops AI...\n');

  // Validate environment variables
  if (!process.env.GROQ_API_KEY) {
    console.error('❌ GROQ_API_KEY not found in .env file');
    console.error('Get one free at: https://console.groq.com/');
    process.exit(1);
  }

  if (!process.env.DATABASE_URL) {
    console.warn('⚠️  DATABASE_URL not found - make sure to set it up');
  }

  try {
    // Initialize WhatsApp client
    console.log('📱 Initializing WhatsApp...');
    const whatsappClient = new WhatsAppClient();

    // Register message handler
    whatsappClient.onMessage(async (msg) => {
      await messageHandler.handle(msg, whatsappClient);
    });

    // Start WhatsApp client
    await whatsappClient.initialize();

    console.log('\n✅ SME Ops AI is running!');
    console.log('📱 WhatsApp bot is active and ready to receive messages');
    console.log('\n💡 Tips:');
    console.log('   - Send a message to your WhatsApp to test');
    console.log('   - Press Ctrl+C to stop\n');

  } catch (error) {
    console.error('❌ Startup failed:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n👋 Shutting down gracefully...');
  process.exit(0);
});

// Start the application
main();