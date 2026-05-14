# SME Ops AI

AI-powered operations assistant for Nigerian SMEs via WhatsApp.

## Features

- 📄 Create invoices via WhatsApp
- 👥 Manage customers
- 💰 Track payments
- 🤖 Natural language interface

## Local Development

### Prerequisites

- Node.js 18+
- PostgreSQL
- WhatsApp account

### Setup

1. Clone and install:
```bash
git clone <your-repo>
cd sme-ops-ai
npm install
```

2. Configure environment:
```bash
cp .env.example .env
# Edit .env and add your API keys
```

3. Setup database:
```bash
npm run db:setup
```

4. Start development:
```bash
npm run dev
```

5. Scan QR code with WhatsApp

## Deployment

### Railway

1. Create Railway account
2. Create new project
3. Add PostgreSQL database
4. Connect GitHub repo
5. Deploy!

## Usage

Send a WhatsApp message:
- "Create invoice for John, ₦50,000 for web design"
- "Show my invoices"
- "Add customer Sarah"

## Tech Stack

- Node.js + Express
- PostgreSQL
- Claude AI (Anthropic)
- WhatsApp Web.js

## License

MIT