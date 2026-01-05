# WhatsApp Gateway SaaS

A production-ready WhatsApp Gateway SaaS built with Node.js, Express, MySQL, and Baileys. Features OAuth authentication, multi-tenant architecture, and provider-agnostic design for future Official WhatsApp API integration.

## Features

- 🔐 External OAuth authentication (no internal user management)
- 🏢 Multi-tenant workspace model
- 📱 Baileys WhatsApp integration (unofficial API)
- 🔌 Provider-agnostic architecture
- 📊 REST API + EJS dashboard
- 📨 Message logging and webhook delivery
- ⚡ Rate limiting per workspace
- 🔑 API key management

## Prerequisites

- Node.js >= 18.0.0
- MySQL >= 8.0
- Redis (optional, for queue management)
- External OAuth provider (membership system)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd whatsapp-gateway-saas
```

2. Install dependencies:
```bash
npm install
```

3. Copy environment file:
```bash
cp .env.example .env
```

4. Configure your `.env` file with database and OAuth credentials

5. Initialize the database:
```bash
npm run db:init
```

6. Build Tailwind CSS:
```bash
npm run build:css
```

7. Start the server:
```bash
# Development
npm run dev

# Production
npm start
```

## Architecture

```
├── src/
│   ├── server.js              # Entry point
│   ├── app.js                 # Express app setup
│   ├── config/                # Configuration files
│   ├── providers/             # WhatsApp provider abstraction
│   │   ├── interface.js       # Base provider interface
│   │   ├── factory.js         # Provider factory
│   │   └── baileys/           # Baileys implementation
│   ├── routes/                # API and web routes
│   ├── controllers/           # Request handlers
│   ├── services/              # Business logic
│   ├── models/                # Database models
│   ├── middlewares/           # Express middlewares
│   ├── utils/                 # Utilities
│   └── views/                 # EJS templates
├── database/                  # Database schema and migrations
├── public/                    # Static assets
└── sessions/                  # Baileys session storage
```

## API Endpoints

### Authentication
- OAuth flow handled via membership system
- API key authentication for server-to-server

### Accounts
- `POST /api/accounts` - Create WhatsApp account
- `GET /api/accounts` - List accounts
- `GET /api/accounts/:id` - Get account details
- `DELETE /api/accounts/:id` - Delete account

### Messages
- `POST /api/messages/send` - Send message
- `GET /api/messages` - List messages
- `GET /api/messages/:id` - Get message details

### Webhooks
- `POST /api/webhooks` - Configure webhook
- `GET /api/webhooks` - Get webhook config
- `PUT /api/webhooks` - Update webhook
- `DELETE /api/webhooks` - Remove webhook

### API Keys
- `POST /api/keys` - Generate API key
- `GET /api/keys` - List API keys
- `DELETE /api/keys/:id` - Revoke API key

## Usage

### Connecting WhatsApp Account

1. Log in via OAuth
2. Navigate to "Connect Account"
3. Scan QR code with WhatsApp mobile app
4. Wait for connection confirmation

### Sending Messages

```bash
curl -X POST http://localhost:3000/api/messages/send \
  -H "Authorization: Bearer YOUR_OAUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": 1,
    "recipient": "+1234567890",
    "type": "text",
    "content": {
      "text": "Hello from WhatsApp Gateway!"
    }
  }'
```

### Using API Keys

```bash
curl -X POST http://localhost:3000/api/messages/send \
  -H "X-API-Key: gw_live_abc123..." \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": 1,
    "recipient": "+1234567890",
    "type": "text",
    "content": {
      "text": "Hello!"
    }
  }'
```

## Subscription Tiers

| Tier | Devices | Rate Limit | Message Retention | Webhooks |
|------|---------|------------|-------------------|----------|
| Free | 1 | 30/min | 7 days | ❌ |
| Starter | 3 | 60/min | 30 days | ✅ |
| Professional | 10 | 120/min | 90 days | ✅ |
| Enterprise | 50 | 300/min | 365 days | ✅ |

## Security

- OAuth token validation
- API key hashing (SHA-256)
- Rate limiting per workspace
- Input validation and sanitization
- CORS protection
- Helmet security headers
- SQL injection prevention (parameterized queries)

## Baileys Disclaimer

⚠️ **Important**: This system uses Baileys, an **unofficial** WhatsApp Web API.

- Not endorsed by WhatsApp/Meta
- Account ban risk exists
- May break with WhatsApp updates
- Suitable for testing and small-scale use
- Official WhatsApp API integration planned for Phase 3

## Production Deployment

1. Set `NODE_ENV=production`
2. Use strong `SESSION_SECRET`
3. Enable HTTPS
4. Configure PM2 for process management
5. Setup database backups
6. Configure log rotation
7. Setup monitoring and alerts

## Development

```bash
# Run with auto-reload
npm run dev

# Run linter
npm run lint

# Run tests
npm test

# Build CSS
npm run build:css
```

## License

MIT

## Support

For issues and questions, please refer to the documentation in `/docs`

