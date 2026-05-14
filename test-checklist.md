# Testing Checklist

## Before First Test

- [ ] .env file configured with API keys
- [ ] PostgreSQL database running
- [ ] `npm run db:setup` executed successfully
- [ ] WhatsApp QR code scanned

## Basic Tests

### Test 1: Welcome Message
- [ ] Send first message to bot
- [ ] Receive welcome message
- [ ] Tenant created in database

### Test 2: Create Invoice
- [ ] Say "Invoice for John, ₦50,000 for web design"
- [ ] Receive formatted invoice
- [ ] Invoice saved in database
- [ ] Customer auto-created

### Test 3: View Invoices
- [ ] Say "Show my invoices"
- [ ] Receive list of invoices
- [ ] Correct formatting

### Test 4: Add Customer
- [ ] Say "Add customer Sarah Johnson"
- [ ] Receive confirmation
- [ ] Customer saved in database

### Test 5: View Customers
- [ ] Say "Show my customers"
- [ ] Receive customer list

### Test 6: Usage Limits
- [ ] Create 10+ invoices
- [ ] Hit free tier limit
- [ ] Receive upgrade message

### Test 7: General Chat
- [ ] Say "Hello, how are you?"
- [ ] Receive conversational response
- [ ] Context maintained

### Test 8: Help
- [ ] Say "help"
- [ ] Receive help guide

## Database Tests

- [ ] Check tenants table has entry
- [ ] Check customers table populated
- [ ] Check invoices table populated
- [ ] Check events table tracking
- [ ] Check usage table counting

## Edge Cases

- [ ] Send gibberish - graceful handling
- [ ] Send very long message - doesn't crash
- [ ] Send multiple rapid messages - all processed
- [ ] Restart bot - session persists

## Production Readiness

- [ ] Environment variables secured
- [ ] Database backed up
- [ ] Error logging working
- [ ] WhatsApp stays connected 24/7
- [ ] Memory usage stable

## First 5 Real Users

- [ ] User 1: Onboarded, created invoice
- [ ] User 2: Onboarded, created invoice
- [ ] User 3: Onboarded, created invoice
- [ ] User 4: Onboarded, created invoice
- [ ] User 5: Onboarded, created invoice

## Success Metrics

- [ ] 80%+ messages understood correctly
- [ ] <5 second response time
- [ ] Zero crashes in 24 hours
- [ ] All invoices created successfully