# WhatsApp Gateway API Documentation

## Base URL

```
Production: https://your-domain.com/api
Development: http://localhost:3000/api
```

## Authentication

### OAuth Token (User-facing)

```http
Authorization: Bearer <oauth_access_token>
```

### API Key (Server-to-server)

```http
X-API-Key: gw_live_abc123...
```

## Endpoints

### Accounts

#### Create Account
```http
POST /api/accounts
```

**Request Body:**
```json
{
  "provider": "baileys",
  "displayName": "My Business Account",
  "baileysDisclaimerAccepted": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Account created successfully",
  "data": {
    "id": 1,
    "provider": "baileys",
    "status": "connecting",
    "qrCode": "data:image/png;base64,...",
    "qrExpiresAt": "2026-01-03T12:01:00.000Z"
  }
}
```

#### List Accounts
```http
GET /api/accounts
```

#### Get Account Details
```http
GET /api/accounts/:id
```

#### Get QR Code
```http
GET /api/accounts/:id/qr
```

#### Get Account Status
```http
GET /api/accounts/:id/status
```

#### Delete Account
```http
DELETE /api/accounts/:id
```

### Messages

#### Send Message
```http
POST /api/messages/send
```

**Request Body (Text):**
```json
{
  "accountId": 1,
  "recipient": "+1234567890",
  "type": "text",
  "content": {
    "text": "Hello from WhatsApp Gateway!"
  }
}
```

**Request Body (Media):**
```json
{
  "accountId": 1,
  "recipient": "+1234567890",
  "type": "image",
  "content": {
    "mediaUrl": "https://example.com/image.jpg",
    "caption": "Check this out!"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Message sent successfully",
  "data": {
    "messageId": "3EB0123456789",
    "logId": 42,
    "status": "sent",
    "sentAt": "2026-01-03T12:00:00.000Z"
  }
}
```

#### List Messages
```http
GET /api/messages?limit=50&offset=0&accountId=1
```

#### Get Message Details
```http
GET /api/messages/:id
```

#### Get Message Statistics
```http
GET /api/messages/stats?days=7&accountId=1
```

### Webhooks

#### Configure Webhook
```http
POST /api/webhooks
```

**Request Body:**
```json
{
  "url": "https://myapp.com/webhooks/whatsapp",
  "events": ["message.received", "message.status", "connection.update"],
  "secret": "your_webhook_secret"
}
```

#### Get Webhook Configuration
```http
GET /api/webhooks
```

#### Update Webhook
```http
PUT /api/webhooks
```

#### Delete Webhook
```http
DELETE /api/webhooks
```

#### Test Webhook
```http
POST /api/webhooks/test
```

### API Keys

#### Create API Key
```http
POST /api/keys
```

**Request Body:**
```json
{
  "name": "Production Server"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "apiKey": "gw_live_abc123xyz789...",
    "prefix": "gw_live_abc1",
    "message": "IMPORTANT: Save this API key securely. It will not be shown again."
  }
}
```

#### List API Keys
```http
GET /api/keys
```

#### Revoke API Key
```http
POST /api/keys/:id/revoke
```

#### Delete API Key
```http
DELETE /api/keys/:id
```

## Webhook Payload Format

### Message Received
```json
{
  "event": "message.received",
  "accountId": 1,
  "message": {
    "id": "3EB0123456789",
    "from": "+1234567890",
    "to": "+0987654321",
    "type": "text",
    "content": {
      "text": "Hello!"
    },
    "timestamp": 1704283200000,
    "direction": "incoming"
  },
  "timestamp": 1704283200000,
  "workspaceId": 1
}
```

### Connection Update
```json
{
  "event": "connection.update",
  "accountId": 1,
  "status": "connected",
  "phoneNumber": "+1234567890",
  "timestamp": 1704283200000,
  "workspaceId": 1
}
```

### Message Status
```json
{
  "event": "message.status",
  "accountId": 1,
  "messageId": "3EB0123456789",
  "status": "delivered",
  "timestamp": 1704283200000,
  "workspaceId": 1
}
```

## Error Responses

```json
{
  "success": false,
  "error": "Error message here"
}
```

## Rate Limiting

Rate limits are enforced per workspace based on subscription tier.

**Headers:**
```
X-RateLimit-Limit: 120
X-RateLimit-Remaining: 119
X-RateLimit-Reset: 2026-01-03T12:01:00.000Z
```

**Status Code:** 429 Too Many Requests

## Status Codes

- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 422: Validation Error
- 429: Rate Limit Exceeded
- 500: Internal Server Error

