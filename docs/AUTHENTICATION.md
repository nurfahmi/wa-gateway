# Authentication Guide

## Overview

This WhatsApp Gateway SaaS uses **external OAuth authentication only**. There is no traditional username/password login or superadmin account.

## Authentication Methods

### 1. Production: OAuth Authentication (Recommended)

**How it works:**
- Users authenticate via your external membership system
- OAuth tokens are validated
- Workspaces auto-created on first login
- No passwords stored in this system

**Setup:**
1. Configure OAuth credentials in `.env`:
```env
AUTH_SERVER_URL=https://your-membership-system.com
OAUTH_CLIENT_ID=your_client_id
OAUTH_CLIENT_SECRET=your_client_secret
OAUTH_REDIRECT_URI=http://localhost:3000/auth/callback
```

2. Access the gateway:
```
http://localhost:3000
```

3. Click "Sign in with Membership"

4. Login at your membership system

5. You'll be redirected back with a workspace auto-created

**First user becomes workspace owner automatically.**

---

### 2. Development: Bypass OAuth (DEV ONLY)

For local testing **without setting up OAuth provider**, use the dev login route:

**⚠️ ONLY works when `NODE_ENV=development`**

#### Quick Login

**Access:**
```
http://localhost:3000/dev-login
```

**What it does:**
- Creates a test user: `dev@example.com`
- Creates workspace: "Development Workspace"
- Sets subscription: Enterprise (50 devices, 300 req/min)
- Logs you in automatically
- Redirects to dashboard

#### View Dev Users

```
http://localhost:3000/dev-users
```

Returns list of all workspace users (for debugging).

**⚠️ IMPORTANT:** Delete `src/routes/web/dev-auth.js` before deploying to production!

---

### 3. Direct Database Access (Admin Tasks)

For administrative tasks, use MySQL directly:

```bash
# Connect to database
mysql -u root -p whatsapp_gateway
```

#### View All Workspaces
```sql
SELECT 
  w.id,
  w.name,
  w.subscription_tier,
  w.device_limit,
  w.is_active,
  COUNT(wu.id) as user_count
FROM workspaces w
LEFT JOIN workspace_users wu ON w.id = wu.workspace_id
GROUP BY w.id;
```

#### View All Users
```sql
SELECT 
  wu.id,
  wu.email,
  wu.full_name,
  wu.oauth_user_id,
  w.name as workspace_name,
  wu.role
FROM workspace_users wu
JOIN workspaces w ON wu.workspace_id = w.id;
```

#### Manually Create Admin Workspace
```sql
-- Create workspace
INSERT INTO workspaces (name, subscription_tier, device_limit, rate_limit_per_minute) 
VALUES ('Admin Workspace', 'enterprise', 50, 300);

-- Link OAuth user (use your actual OAuth user ID)
INSERT INTO workspace_users (workspace_id, oauth_user_id, email, full_name, role) 
VALUES (1, 'your_oauth_user_id_from_membership_system', 'admin@example.com', 'Admin User', 'owner');
```

#### Update Subscription Tier
```sql
UPDATE workspaces 
SET subscription_tier = 'enterprise',
    device_limit = 50,
    rate_limit_per_minute = 300
WHERE id = 1;
```

#### Grant Access to Existing Workspace
```sql
INSERT INTO workspace_users (workspace_id, oauth_user_id, email, full_name, role) 
VALUES (1, 'oauth_user_456', 'user@example.com', 'Another User', 'owner');
```

---

## User Roles

Currently, the system has a simple role structure:

- **owner** - Full access to workspace (default for all users)

Future roles (Phase 2):
- **admin** - Manage accounts and messages
- **member** - View only
- **developer** - API access only

---

## Workspace Management

### Subscription Tiers

| Tier | Device Limit | Rate Limit | Features |
|------|--------------|------------|----------|
| free | 1 | 30/min | Basic |
| starter | 3 | 60/min | Webhooks |
| professional | 10 | 120/min | All features |
| enterprise | 50 | 300/min | Priority support |

Tiers are **automatically set from OAuth subscriptions** or can be manually updated in database.

### Auto-Workspace Creation

When a user logs in via OAuth for the first time:

1. System checks for existing `workspace_users` record
2. If not found, creates new workspace
3. Workspace name: `{User Name}'s Workspace`
4. Subscription tier from OAuth subscription data
5. Creates `workspace_users` mapping
6. User becomes owner

---

## API Authentication

### Via OAuth Token

```bash
curl -H "Authorization: Bearer <oauth_access_token>" \
  http://localhost:3000/api/accounts
```

**Used for:**
- Dashboard access
- User-facing API calls

### Via API Key

```bash
curl -H "X-API-Key: gw_live_abc123..." \
  http://localhost:3000/api/messages/send \
  -d '{"accountId":1,"recipient":"+1234567890","type":"text","content":{"text":"Hello"}}'
```

**Used for:**
- Server-to-server communication
- Automation scripts
- Integrations

**Generate via dashboard:** Settings → API Keys

---

## Security Notes

### OAuth Trust Model

This system **fully trusts** the external OAuth provider:
- No password validation in gateway
- No user registration in gateway
- User info comes from OAuth token
- Subscription data from OAuth token

### Token Storage

- Access tokens stored in session (server-side)
- Refresh tokens stored in session
- Session expires after 24 hours
- Tokens revoked on logout

### API Keys

- Hashed with SHA-256
- Only shown once at creation
- Can be revoked anytime
- Last used timestamp tracked

---

## Troubleshooting

### Can't Login

**Problem:** OAuth redirect fails

**Solutions:**
1. Check `OAUTH_REDIRECT_URI` matches exactly in both systems
2. Verify OAuth credentials in `.env`
3. Check OAuth server is accessible
4. Review logs: `tail -f logs/combined.log`

### Dev Login Not Working

**Problem:** `/dev-login` returns 404

**Solutions:**
1. Ensure `NODE_ENV=development` in `.env`
2. Restart server after changing `.env`
3. Check console for warning message

### Token Expired

**Problem:** Session expired

**Solutions:**
1. Log out and log in again
2. Clear browser cookies
3. Check OAuth token validity

### Database Access Denied

**Problem:** Can't connect to MySQL

**Solutions:**
1. Verify credentials in `.env`
2. Check MySQL is running: `mysql -u root -p`
3. Verify database exists: `SHOW DATABASES;`

---

## Testing Authentication

### Test OAuth Flow
1. Start server: `npm run dev`
2. Visit: `http://localhost:3000`
3. Click "Sign in with Membership"
4. Complete OAuth flow
5. Check you're redirected to dashboard

### Test Dev Login
1. Ensure `NODE_ENV=development`
2. Visit: `http://localhost:3000/dev-login`
3. Should redirect to dashboard
4. Check workspace created in database

### Test API Key
1. Login to dashboard
2. Go to API Keys
3. Generate new key
4. Test with curl:
```bash
curl -H "X-API-Key: gw_live_..." http://localhost:3000/api/accounts
```

---

## Production Checklist

Before deploying to production:

- [ ] Remove `src/routes/web/dev-auth.js`
- [ ] Set `NODE_ENV=production`
- [ ] Use strong `SESSION_SECRET`
- [ ] Configure real OAuth credentials
- [ ] Enable HTTPS
- [ ] Test OAuth flow end-to-end
- [ ] Verify API key generation works
- [ ] Test token refresh
- [ ] Setup session store (Redis recommended)
- [ ] Configure CORS properly

---

## Quick Reference

### Login URLs

| Purpose | URL | Requirements |
|---------|-----|--------------|
| OAuth Login | `/auth/login` | OAuth provider configured |
| Dev Login | `/dev-login` | NODE_ENV=development |
| Logout | `/auth/logout` | Logged in session |
| OAuth Callback | `/auth/callback` | OAuth redirect |

### API Authentication

| Method | Header | Use Case |
|--------|--------|----------|
| OAuth | `Authorization: Bearer <token>` | User-facing |
| API Key | `X-API-Key: gw_live_...` | Server-to-server |

---

Need help? Check other docs:
- Setup Guide: `docs/SETUP.md`
- API Reference: `docs/API.md`
- Deployment: `docs/DEPLOYMENT.md`

