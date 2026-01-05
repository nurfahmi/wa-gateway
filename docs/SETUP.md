# Setup Guide

## Prerequisites

- Node.js 18+ 
- MySQL 8.0+
- Redis (optional, for queue management)
- External OAuth Provider (membership system)

## Installation Steps

### 1. Clone and Install

```bash
git clone <repository-url>
cd whatsapp-gateway-saas
npm install
```

### 2. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Application
NODE_ENV=development
PORT=3000
APP_URL=http://localhost:3000

# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=whatsapp_gateway
DB_USER=root
DB_PASSWORD=your_password

# Session
SESSION_SECRET=generate-a-random-secret-here

# OAuth Configuration
AUTH_SERVER_URL=https://your-membership-system.com
OAUTH_CLIENT_ID=your_client_id
OAUTH_CLIENT_SECRET=your_client_secret
OAUTH_REDIRECT_URI=http://localhost:3000/auth/callback
```

### 3. Initialize Database

```bash
npm run db:init
```

This will:
- Create the database
- Create all tables
- Add sample data

### 4. Build Tailwind CSS

```bash
npm run build:css
```

For development with auto-rebuild:

```bash
npm run build:css:watch
```

### 5. Start the Server

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

The application will be available at `http://localhost:3000`.

## OAuth Provider Setup

### Register OAuth Client

In your membership system, register this application as an OAuth client:

1. **Client Name:** WhatsApp Gateway
2. **Redirect URI:** `http://localhost:3000/auth/callback` (or your production URL)
3. **Scopes:** `profile`, `email`, `subscriptions`
4. **Type:** Confidential

### Configure Subscription Products

Create products in your membership system with these types:

- **Free:** 1 device, 30 req/min
- **Starter:** 3 devices, 60 req/min
- **Professional:** 10 devices, 120 req/min
- **Enterprise:** 50 devices, 300 req/min

## First Login

1. Navigate to `http://localhost:3000`
2. Click "Sign in with Membership"
3. Log in via your membership system
4. You'll be redirected back and a workspace will be auto-created

## Connect WhatsApp Account

1. Go to Dashboard → Accounts → Connect Account
2. Accept the Baileys disclaimer
3. Click "Connect WhatsApp Account"
4. Scan the QR code with your WhatsApp mobile app
5. Wait for connection confirmation

## Send Your First Message

### Via Dashboard

Use the web interface to send messages through connected accounts.

### Via API

```bash
curl -X POST http://localhost:3000/api/messages/send \
  -H "X-API-Key: your_api_key" \
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

## Troubleshooting

### Database Connection Failed

- Check MySQL is running: `mysql -u root -p`
- Verify credentials in `.env`
- Ensure database exists

### OAuth Redirect Mismatch

- Verify `OAUTH_REDIRECT_URI` in `.env` matches registered URI exactly
- Check for trailing slashes

### QR Code Not Appearing

- Check logs: `tail -f logs/combined.log`
- Ensure sessions folder exists: `mkdir -p sessions`
- Restart the server

### Messages Not Sending

- Verify account status: GET `/api/accounts/:id/status`
- Check account is connected
- Review error logs

## Next Steps

- Configure webhooks for incoming messages
- Generate API keys for programmatic access
- Review API documentation: `docs/API.md`
- Setup production environment
- Configure PM2 for process management

