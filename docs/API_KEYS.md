# API Keys Documentation

## Overview

This system uses **two types of API keys**:

1. **Baileys Service API Key** - Internal service authentication
2. **Device/User API Keys** - Per-workspace authentication (stored in database)

---

## 1. Baileys Service API Key

### Purpose
- Used for **internal communication** between Baileys provider and the gateway
- Static key configured in `.env`
- **Not stored in database**
- Used by the Baileys service itself

### Configuration

Add to your `.env` file:

```env
# Baileys Service API Key (for internal Baileys provider communication)
BAILEYS_SERVICE_API_KEY=baileys_service_dev_key_12345
```

### Generate a New Service Key

```bash
node -e "console.log('baileys_service_' + require('crypto').randomBytes(32).toString('hex'))"
```

### Usage

Internal services use this key:

```bash
curl http://localhost:4000/internal/baileys/webhook \
  -H "X-API-Key: baileys_service_dev_key_12345" \
  -H "Content-Type: application/json" \
  -d '{"event": "connection.update", ...}'
```

---

## 2. Device/User API Keys

### Purpose
- Used for **user/device authentication** via REST API
- Stored in database (hashed)
- **Per-workspace** - each workspace can have multiple keys
- Format: `gw_live_*` or `gw_test_*`

### Configuration

#### Option A: Seed a Development Key

Add to your `.env` file:

```env
# Development API Key (for testing without OAuth)
DEV_API_KEY=gw_live_7832506cacd834dbe8ab71b0cff80ee67fa012bed843aa59eb121a7d41a99324
```

Then run:

```bash
npm run db:init
```

#### Option B: Generate via Dashboard

1. Login to dashboard: `http://localhost:4000/dev-login`
2. Go to **API Keys** section
3. Click **Create API Key**
4. Save the key (shown only once)

#### Option C: Generate via Script

```bash
node scripts/generate-api-key.js
```

### Usage

Users/devices use this key to access the API:

```bash
# List accounts
curl http://localhost:4000/api/accounts \
  -H "X-API-Key: gw_live_7832506cacd834dbe8ab71b0cff80ee67fa012bed843aa59eb121a7d41a99324"

# Send message
curl -X POST http://localhost:4000/api/messages/send \
  -H "X-API-Key: gw_live_7832506cacd834dbe8ab71b0cff80ee67fa012bed843aa59eb121a7d41a99324" \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": 1,
    "recipient": "+1234567890",
    "type": "text",
    "content": {"text": "Hello!"}
  }'
```

---

## Key Differences

| Feature | Baileys Service Key | Device/User API Key |
|---------|-------------------|-------------------|
| **Storage** | `.env` file only | Database (hashed) |
| **Purpose** | Internal service auth | User/device auth |
| **Format** | `baileys_service_*` | `gw_live_*` or `gw_test_*` |
| **Scope** | Global (entire service) | Per-workspace |
| **Management** | Manual (env file) | Dashboard/API |
| **Expiration** | Never | Optional |
| **Revocation** | Change .env + restart | Via dashboard/API |

---

## Security Best Practices

### Baileys Service Key
- ✅ Keep in `.env` file (never commit)
- ✅ Use strong random value in production
- ✅ Rotate periodically
- ✅ Restrict to internal network only
- ❌ Never expose publicly
- ❌ Never share with users

### Device/User API Keys
- ✅ Store hashed in database
- ✅ Show plaintext only once on creation
- ✅ Allow users to revoke/regenerate
- ✅ Set expiration dates for production
- ✅ Log usage for audit trail
- ❌ Never log the full key value

---

## Complete .env Example

```env
# Application
NODE_ENV=development
PORT=4000
APP_URL=http://localhost:4000

# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=whatsapp_gateway
DB_USER=root
DB_PASSWORD=

# Session
SESSION_SECRET=change-this-secret-in-production

# Baileys WhatsApp Provider
BAILEYS_SESSION_PATH=sessions

# ==========================================
# API KEYS
# ==========================================

# 1. Baileys Service API Key (Internal service authentication)
#    Used by Baileys provider to communicate with gateway
BAILEYS_SERVICE_API_KEY=baileys_service_dev_key_12345

# 2. Development Device API Key (Optional, for testing)
#    This will be seeded into database on npm run db:init
DEV_API_KEY=gw_live_7832506cacd834dbe8ab71b0cff80ee67fa012bed843aa59eb121a7d41a99324
```

---

## Middleware Flow

### For User API Requests

```
Request with X-API-Key
    ↓
authMiddleware
    ↓
Check if Baileys Service Key? → Yes → Set req.isBaileysService = true
    ↓ No
Validate format (gw_live_* or gw_test_*)
    ↓
Hash key and lookup in database
    ↓
Check if active and not expired
    ↓
Attach req.apiKey with workspace info
    ↓
workspaceContextMiddleware
    ↓
Attach req.workspace
    ↓
Route handler
```

### For Internal Baileys Service

```
Request with X-API-Key
    ↓
baileysServiceMiddleware
    ↓
Compare with BAILEYS_SERVICE_API_KEY
    ↓
Set req.isBaileysService = true
    ↓
Route handler
```

---

## Troubleshooting

### "Authentication required (Bearer token or X-API-Key)"
- Add `X-API-Key` header to your request
- Or use OAuth Bearer token

### "Invalid API key"
- Check key format (`gw_live_*` or `gw_test_*`)
- Verify key exists in database: `SELECT * FROM api_keys WHERE key_prefix = 'gw_live_7832';`
- Check if key is active: `is_active = TRUE`
- Check if key is expired: `expires_at IS NULL OR expires_at > NOW()`

### "API key validation failed"
- Check database connection
- Verify key hash matches
- Check server logs for detailed error

### Baileys Service Key Not Working
- Verify `BAILEYS_SERVICE_API_KEY` is set in `.env`
- Restart server after changing `.env`
- Check middleware is using `baileysServiceMiddleware`

---

## Migration Guide

If you have existing API keys and want to add Baileys service key:

1. **Add to `.env`:**
   ```env
   BAILEYS_SERVICE_API_KEY=your_generated_service_key
   ```

2. **Restart server:**
   ```bash
   npm start
   ```

3. **Update Baileys service** to use new service key

4. **Existing user API keys** continue to work unchanged

---

## API Endpoints

### Manage Device/User API Keys

```bash
# Create API key (requires OAuth)
POST /api/keys
{
  "name": "My Device Key"
}

# List API keys
GET /api/keys

# Revoke API key
POST /api/keys/:id/revoke

# Delete API key
DELETE /api/keys/:id
```

---

## Quick Start

1. **Add both keys to `.env`:**
   ```env
   BAILEYS_SERVICE_API_KEY=baileys_service_dev_key_12345
   DEV_API_KEY=gw_live_7832506cacd834dbe8ab71b0cff80ee67fa012bed843aa59eb121a7d41a99324
   ```

2. **Initialize database:**
   ```bash
   npm run db:init
   ```

3. **Start server:**
   ```bash
   npm start
   ```

4. **Test device API key:**
   ```bash
   curl http://localhost:4000/api/accounts \
     -H "X-API-Key: gw_live_7832506cacd834dbe8ab71b0cff80ee67fa012bed843aa59eb121a7d41a99324"
   ```

5. **Test Baileys service key:**
   ```bash
   curl http://localhost:4000/internal/baileys/status \
     -H "X-API-Key: baileys_service_dev_key_12345"
   ```

