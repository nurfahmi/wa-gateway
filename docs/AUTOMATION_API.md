# Automation API Documentation

Complete guide for using the automation features including auto-reply rules, AI assistant, templates, contacts, scheduled messages, and broadcasts.

---

## Table of Contents

1. [Auto-Reply Rules](#auto-reply-rules)
2. [AI Configuration](#ai-configuration)
3. [Message Templates](#message-templates)
4. [Contacts Management](#contacts-management)
5. [Scheduled Messages](#scheduled-messages)
6. [Broadcast Messages](#broadcast-messages)

---

## Authentication

All automation endpoints require either:
- **Session Cookie** (for dashboard UI)
- **API Key** header: `X-API-Key: your_api_key`

---

## Auto-Reply Rules

### List All Rules

```http
GET /api/automation/rules
```

**Response:**
```json
{
  "success": true,
  "data": {
    "rules": [
      {
        "id": 1,
        "workspace_id": 1,
        "account_id": null,
        "name": "Welcome Message",
        "trigger_type": "welcome",
        "trigger_value": null,
        "reply_message": "Hi! 👋 Thanks for reaching out.",
        "is_active": true,
        "priority": 100,
        "delay_seconds": 0
      }
    ]
  }
}
```

### Create Auto-Reply Rule

```http
POST /api/automation/rules
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Pricing Inquiry",
  "trigger_type": "contains",
  "trigger_value": "price,pricing,cost",
  "reply_message": "Our pricing starts at $99/month. Visit https://example.com/pricing",
  "is_active": true,
  "priority": 90,
  "delay_seconds": 2,
  "account_id": null
}
```

**Trigger Types:**
- `welcome` - First message from a contact
- `keyword` - Matches specific keywords
- `contains` - Message contains any of the keywords (comma-separated)
- `exact_match` - Exact text match
- `regex` - Regular expression match
- `business_hours` - Outside business hours
- `fallback` - Default reply when no other rule matches

### Update Rule

```http
PUT /api/automation/rules/:id
Content-Type: application/json
```

### Delete Rule

```http
DELETE /api/automation/rules/:id
```

### Toggle Rule Status

```http
PATCH /api/automation/rules/:id/toggle
Content-Type: application/json
```

**Request Body:**
```json
{
  "is_active": false
}
```

---

## AI Configuration

### Get AI Configuration

```http
GET /api/automation/ai/config?accountId=1
```

**Response:**
```json
{
  "success": true,
  "data": {
    "config": {
      "id": 1,
      "workspace_id": 1,
      "account_id": 1,
      "is_enabled": true,
      "provider": "openai",
      "model": "gpt-4",
      "system_prompt": "You are a helpful customer support assistant.",
      "bot_name": "Support Bot",
      "temperature": 0.7,
      "max_tokens": 500,
      "auto_reply_enabled": true,
      "auto_reply_delay_seconds": 2,
      "conversation_memory_enabled": true,
      "conversation_memory_messages": 10
    }
  }
}
```

### Update AI Configuration

```http
PUT /api/automation/ai/config?accountId=1
Content-Type: application/json
```

**Request Body:**
```json
{
  "is_enabled": true,
  "auto_reply_enabled": true,
  "system_prompt": "You are a helpful assistant. Be concise and friendly.",
  "temperature": 0.7,
  "max_tokens": 500
}
```

### Toggle AI Auto-Reply

```http
POST /api/automation/ai/toggle
Content-Type: application/json
```

**Request Body:**
```json
{
  "accountId": 1,
  "enabled": true
}
```

### Clear Conversation History

```http
DELETE /api/automation/ai/history/:contactPhone
```

---

## Message Templates

### List All Templates

```http
GET /api/automation/templates?category=support&favorite=true
```

**Response:**
```json
{
  "success": true,
  "data": {
    "templates": [
      {
        "id": 1,
        "workspace_id": 1,
        "name": "Welcome Message",
        "content": "Hi {{name}}! 👋 Welcome to our service.",
        "category": "greeting",
        "variables": ["name"],
        "usage_count": 45,
        "is_favorite": true
      }
    ]
  }
}
```

### Get Single Template

```http
GET /api/automation/templates/:id
```

### Create Template

```http
POST /api/automation/templates
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Order Confirmation",
  "content": "Your order #{{order_id}} has been confirmed! Total: ${{amount}}",
  "category": "sales",
  "is_favorite": false
}
```

**Variables** are automatically extracted from `{{variable}}` syntax.

### Update Template

```http
PUT /api/automation/templates/:id
Content-Type: application/json
```

### Delete Template

```http
DELETE /api/automation/templates/:id
```

### Toggle Favorite

```http
PATCH /api/automation/templates/:id/favorite
Content-Type: application/json
```

**Request Body:**
```json
{
  "is_favorite": true
}
```

---

## Contacts Management

### List Contacts

```http
GET /api/automation/contacts?search=john&tags=vip,customer&limit=50
```

**Response:**
```json
{
  "success": true,
  "data": {
    "contacts": [
      {
        "id": 1,
        "workspace_id": 1,
        "phone_number": "1234567890",
        "name": "John Doe",
        "email": "john@example.com",
        "tags": ["vip", "customer"],
        "custom_fields": {
          "company": "Acme Inc"
        },
        "message_count": 25,
        "last_message_at": "2026-01-03T10:30:00Z",
        "is_blocked": false
      }
    ]
  }
}
```

### Get Contact Statistics

```http
GET /api/automation/contacts/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "stats": {
      "total_contacts": 150,
      "blocked_contacts": 5,
      "active_contacts_7d": 45,
      "active_contacts_30d": 89
    }
  }
}
```

### Get Single Contact

```http
GET /api/automation/contacts/:id
```

### Create Contact

```http
POST /api/automation/contacts
Content-Type: application/json
```

**Request Body:**
```json
{
  "phone_number": "1234567890",
  "name": "John Doe",
  "email": "john@example.com",
  "tags": ["customer"],
  "custom_fields": {
    "company": "Acme Inc",
    "status": "active"
  }
}
```

### Update Contact

```http
PUT /api/automation/contacts/:id
Content-Type: application/json
```

### Delete Contact

```http
DELETE /api/automation/contacts/:id
```

### Block Contact

```http
POST /api/automation/contacts/:id/block
```

### Unblock Contact

```http
POST /api/automation/contacts/:id/unblock
```

### Import Contacts

```http
POST /api/automation/contacts/import
Content-Type: application/json
```

**Request Body:**
```json
{
  "contacts": [
    {
      "phone_number": "1234567890",
      "name": "John Doe",
      "email": "john@example.com"
    },
    {
      "phone_number": "0987654321",
      "name": "Jane Smith"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "results": {
      "success": 2,
      "failed": 0,
      "errors": []
    }
  }
}
```

### Export Contacts

```http
GET /api/automation/contacts/export
```

Returns all contacts in JSON format for export.

---

## Scheduled Messages

### List Scheduled Messages

```http
GET /api/automation/scheduled?status=pending
```

**Response:**
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": 1,
        "workspace_id": 1,
        "account_id": 1,
        "recipient": "1234567890",
        "message": "Reminder: Your appointment is tomorrow at 10 AM",
        "scheduled_at": "2026-01-04T10:00:00Z",
        "status": "pending"
      }
    ]
  }
}
```

### Schedule a Message

```http
POST /api/automation/scheduled
Content-Type: application/json
```

**Request Body:**
```json
{
  "account_id": 1,
  "recipient": "1234567890",
  "message": "Reminder: Your appointment is tomorrow at 10 AM",
  "scheduled_at": "2026-01-04T10:00:00Z",
  "media_url": null,
  "media_type": null
}
```

### Cancel Scheduled Message

```http
DELETE /api/automation/scheduled/:id
```

---

## Broadcast Messages

### List Broadcasts

```http
GET /api/automation/broadcasts?status=completed
```

**Response:**
```json
{
  "success": true,
  "data": {
    "broadcasts": [
      {
        "id": 1,
        "workspace_id": 1,
        "account_id": 1,
        "name": "Product Launch Announcement",
        "message": "🎉 New product launching tomorrow!",
        "target_type": "all_contacts",
        "status": "completed",
        "total_recipients": 150,
        "sent_count": 145,
        "failed_count": 5,
        "scheduled_at": "2026-01-03T09:00:00Z"
      }
    ]
  }
}
```

### Get Single Broadcast

```http
GET /api/automation/broadcasts/:id
```

### Create Broadcast

```http
POST /api/automation/broadcasts
Content-Type: application/json
```

**Request Body:**
```json
{
  "account_id": 1,
  "name": "Product Launch Announcement",
  "message": "🎉 New product launching tomorrow! Check it out: https://example.com",
  "target_type": "custom",
  "target_phone_numbers": ["1234567890", "0987654321"],
  "scheduled_at": "2026-01-04T09:00:00Z",
  "status": "scheduled"
}
```

**Target Types:**
- `all_contacts` - Send to all contacts
- `group` - Send to a specific contact group
- `custom` - Send to custom list of phone numbers

### Update Broadcast

```http
PUT /api/automation/broadcasts/:id
Content-Type: application/json
```

### Delete Broadcast

```http
DELETE /api/automation/broadcasts/:id
```

---

## Complete Example: Setting Up Automation

### Step 1: Create Auto-Reply Rules

```bash
# Welcome message for new contacts
curl -X POST https://your-domain.com/api/automation/rules \
  -H "X-API-Key: your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Welcome Message",
    "trigger_type": "welcome",
    "reply_message": "Hi! 👋 Thanks for contacting us. How can we help?",
    "priority": 100
  }'

# Pricing inquiry auto-response
curl -X POST https://your-domain.com/api/automation/rules \
  -H "X-API-Key: your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Pricing Inquiry",
    "trigger_type": "contains",
    "trigger_value": "price,pricing,cost,how much",
    "reply_message": "Our pricing starts at $99/month. Visit https://example.com/pricing for details.",
    "priority": 90
  }'
```

### Step 2: Configure AI Assistant

```bash
curl -X PUT https://your-domain.com/api/automation/ai/config \
  -H "X-API-Key: your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "is_enabled": true,
    "auto_reply_enabled": true,
    "system_prompt": "You are a helpful customer support assistant. Be friendly and concise.",
    "model": "gpt-4",
    "temperature": 0.7
  }'
```

### Step 3: Create Message Templates

```bash
curl -X POST https://your-domain.com/api/automation/templates \
  -H "X-API-Key: your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Order Confirmation",
    "content": "Your order #{{order_id}} has been confirmed! Total: ${{amount}}. Estimated delivery: {{date}}.",
    "category": "sales"
  }'
```

### Step 4: Schedule a Broadcast

```bash
curl -X POST https://your-domain.com/api/automation/broadcasts \
  -H "X-API-Key: your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "account_id": 1,
    "name": "Weekend Sale",
    "message": "🎉 Weekend Sale! 20% off all products. Use code: WEEKEND20",
    "target_type": "all_contacts",
    "scheduled_at": "2026-01-06T09:00:00Z"
  }'
```

---

## Automation Flow

When an incoming message is received:

1. **Contact Management** - Contact is automatically created/updated
2. **Auto-Reply Rules** - System checks all active rules in priority order
3. **AI Assistant** - If no auto-reply matches and AI is enabled, AI generates response
4. **Webhooks** - Events are sent to configured webhook URLs

---

## Best Practices

### Auto-Reply Rules

- **Use priorities wisely** - Higher priority rules run first
- **Start broad, get specific** - Use fallback rules as safety net
- **Test keywords** - Use lowercase, comma-separated keywords
- **Add delays** - Natural delay makes responses feel human

### AI Configuration

- **Clear system prompts** - Tell AI exactly how to behave
- **Set token limits** - Keep responses concise
- **Enable memory** - Better context for ongoing conversations
- **Monitor costs** - AI responses consume OpenAI credits

### Templates

- **Use variables** - `{{name}}`, `{{date}}`, etc. for personalization
- **Organize by category** - Makes finding templates easier
- **Test before using** - Ensure variables render correctly

### Broadcasts

- **Schedule wisely** - Consider recipient time zones
- **Pace sending** - System adds 2s delay between messages
- **Track results** - Monitor sent/failed counts
- **Test with small group first** - Send to a few contacts before mass broadcast

---

## Rate Limits

- Auto-reply and AI responses respect workspace rate limits
- Broadcasts send with 2-second delay between recipients
- API endpoints follow standard workspace rate limits

---

## Error Codes

| Code | Message | Description |
|------|---------|-------------|
| 400 | Invalid request body | Check request format |
| 401 | Unauthorized | Missing or invalid API key |
| 404 | Resource not found | ID doesn't exist |
| 429 | Too many requests | Rate limit exceeded |
| 500 | Server error | Contact support |

---

## Need Help?

- **Documentation**: `/docs/`
- **API Reference**: `/docs/API.md`
- **Setup Guide**: `/docs/SETUP.md`
- **Support**: support@example.com

