# OAuth Login Log Examples

This document shows what logs you'll see when users login via OAuth.

---

## 📋 Log Locations

- **Console**: If `NODE_ENV !== 'production'`, logs appear in console
- **File**: `logs/combined.log` (all logs)
- **File**: `logs/error.log` (errors only)

---

## 🔐 Login Flow Logs

### **Step 1: User Initiates Login**

```
🔐 OAuth Login Flow Started
{
  code: "abc123def4...",
  state: "xyz789ghi0..."
}
```

---

### **Step 2: Exchange Authorization Code**

```
🔄 Exchanging Authorization Code for Tokens

✅ Token Exchange Successful
{
  hasAccessToken: true,
  hasRefreshToken: true,
  tokenType: "Bearer"
}
```

---

### **Step 3: Introspect Token (Get User Info)**

```
🔍 Introspecting Token for User Info

📥 OAuth Introspect Response (Login)
{
  active: true,
  user: {
    id: "user_123",
    email: "customer@example.com",
    name: "John Doe"
  },
  subscriptionsCount: 2,
  allSubscriptions: [
    {
      product_id: 1,
      product_name: "WhatsApp Device",
      device_limit: 6,
      rate_limit: null,
      expired_at: "2025-02-01T00:00:00Z"
    },
    {
      product_id: 1,
      product_name: "WhatsApp Device",
      device_limit: 6,
      rate_limit: null,
      expired_at: "2025-02-15T00:00:00Z"
    },
    {
      product_id: 2,
      product_name: "Premium Support",
      device_limit: null,
      rate_limit: null,
      expired_at: "2025-12-31T00:00:00Z"
    }
  ]
}
```

---

### **Step 4: Filter WhatsApp Device Subscriptions**

```
📦 Processing Subscriptions
{
  totalSubscriptions: 3,
  configuredProductNames: ["whatsapp device", "wa device", "whatsapp gateway device"],
  configuredProductIds: "not configured"
}

🔍 Subscription Filter Check
{
  product_id: 1,
  product_name: "WhatsApp Device",
  device_limit: 6,
  nameMatches: true,
  idMatches: false,
  hasDeviceLimit: true,
  isMatch: true,
  reason: "name match"
}

🔍 Subscription Filter Check
{
  product_id: 1,
  product_name: "WhatsApp Device",
  device_limit: 6,
  nameMatches: true,
  idMatches: false,
  hasDeviceLimit: true,
  isMatch: true,
  reason: "name match"
}

🔍 Subscription Filter Check
{
  product_id: 2,
  product_name: "Premium Support",
  device_limit: null,
  nameMatches: false,
  idMatches: false,
  hasDeviceLimit: false,
  isMatch: false,
  reason: "no match"
}

✅ WhatsApp Device Subscriptions Filtered
{
  matched: 2,
  ignored: 1,
  matchedSubscriptions: [
    {
      product_id: 1,
      product_name: "WhatsApp Device",
      device_limit: 6
    },
    {
      product_id: 1,
      product_name: "WhatsApp Device",
      device_limit: 6
    }
  ]
}
```

---

### **Step 5: Workspace Check/Creation**

#### **New User (First Login):**

```
🏢 Checking Workspace for User
{
  userId: "user_123",
  email: "customer@example.com"
}

🆕 New User - Creating Workspace
{
  user: "customer@example.com",
  whatsappDeviceSubscriptions: 2,
  otherProductsIgnored: 1,
  deviceLimit: 12,
  rateLimitPerMinute: 360,
  tier: "per_device",
  subscriptionBreakdown: [
    {
      product_name: "WhatsApp Device",
      device_limit: 6
    },
    {
      product_name: "WhatsApp Device",
      device_limit: 6
    }
  ]
}

✅ Workspace Created Successfully
{
  workspaceId: 5,
  user: "customer@example.com",
  deviceLimit: 12,
  rateLimitPerMinute: 360
}
```

#### **Existing User (Subsequent Login):**

```
🏢 Checking Workspace for User
{
  userId: "user_123",
  email: "customer@example.com"
}

👤 Existing User Login
{
  user: "customer@example.com",
  workspaceId: 5,
  currentDeviceLimit: 12,
  newDeviceLimit: 15,
  currentRateLimit: 360,
  newRateLimit: 450,
  needsSync: true
}

🔄 Syncing Device Limit on Login
{
  user: "customer@example.com",
  workspaceId: 5,
  oldDeviceLimit: 12,
  newDeviceLimit: 15,
  oldRateLimit: 360,
  newRateLimit: 450,
  whatsappDeviceSubscriptions: 3,
  otherProductsIgnored: 1,
  subscriptionDetails: [
    {
      product_name: "WhatsApp Device",
      device_limit: 5
    },
    {
      product_name: "WhatsApp Device",
      device_limit: 5
    },
    {
      product_name: "WhatsApp Device",
      device_limit: 5
    }
  ]
}

✅ Device Limit Synced Successfully
{
  workspaceId: 5,
  user: "customer@example.com",
  deviceLimit: 15,
  rateLimitPerMinute: 450
}
```

#### **No Changes Needed:**

```
👤 Existing User Login
{
  user: "customer@example.com",
  workspaceId: 5,
  currentDeviceLimit: 12,
  newDeviceLimit: 12,
  currentRateLimit: 360,
  newRateLimit: 360,
  needsSync: false
}

✅ Device Limit Already Up-to-Date
{
  workspaceId: 5,
  user: "customer@example.com",
  deviceLimit: 12
}
```

---

### **Step 6: Login Complete**

```
🎉 OAuth Login Flow Completed Successfully
{
  user: "customer@example.com",
  workspaceId: 5,
  deviceLimit: 12
}
```

---

## 🔄 API Request Logs (After Login)

When user makes API requests after login, you'll see:

### **Token Introspection:**

```
🔐 OAuth Token Introspection Request
{
  tokenPrefix: "eyJhbGciOi...",
  timestamp: "2025-01-15T10:30:00.000Z"
}

📥 OAuth Introspect Response Received
{
  active: true,
  user: {
    id: "user_123",
    email: "customer@example.com",
    name: "John Doe"
  },
  subscriptionsCount: 2,
  subscriptions: [
    {
      product_id: 1,
      product_name: "WhatsApp Device",
      device_limit: 6,
      rate_limit: null,
      expired_at: "2025-02-01T00:00:00Z"
    },
    {
      product_id: 1,
      product_name: "WhatsApp Device",
      device_limit: 6,
      rate_limit: null,
      expired_at: "2025-02-15T00:00:00Z"
    }
  ]
}

👤 User Info Extracted
{
  userId: "user_123",
  email: "customer@example.com",
  name: "John Doe"
}

📦 Processing Subscriptions
{
  totalSubscriptions: 2,
  configuredProductNames: ["whatsapp device", "wa device"],
  configuredProductIds: "not configured"
}

✅ WhatsApp Device Subscriptions Filtered
{
  matched: 2,
  ignored: 0,
  matchedSubscriptions: [
    {
      product_id: 1,
      product_name: "WhatsApp Device",
      device_limit: 6
    },
    {
      product_id: 1,
      product_name: "WhatsApp Device",
      device_limit: 6
    }
  ]
}

📊 Subscription Summary
{
  user: "customer@example.com",
  whatsappDeviceSubscriptions: 2,
  otherProductsIgnored: 0,
  totalDevices: 12,
  totalRateLimit: "auto-calculated",
  subscriptionDetails: {
    tier: "per_device",
    product_id: 1,
    device_limit: 12,
    rate_limit: null,
    expired_at: "2025-02-15T00:00:00Z"
  }
}

✅ OAuth Authentication Successful
{
  user: "customer@example.com",
  device_limit: 12
}
```

---

## ❌ Error Logs

### **Invalid Token:**

```
❌ Token is not active: { token: "eyJhbGciOi..." }
```

### **OAuth Error:**

```
OAuth error: access_denied
```

### **State Mismatch:**

```
OAuth state mismatch
```

### **Token Exchange Failed:**

```
OAuth callback error: Error: Failed to exchange code for token: ...
```

### **Token Introspection Failed:**

```
OAuth validation error: Error: Token introspection failed: ...
Token introspection failed - Details: {
  message: "Request failed with status code 401",
  response: { error: "invalid_token" },
  status: 401
}
```

---

## 🆓 Free Tier (No Subscriptions)**

```
📥 OAuth Introspect Response (Login)
{
  active: true,
  user: {
    id: "user_456",
    email: "free@example.com",
    name: "Free User"
  },
  subscriptionsCount: 0,
  allSubscriptions: []
}

🆓 No Subscriptions Found - Using Free Tier
{
  user: "free@example.com",
  device_limit: 1
}

🆕 New User - Creating Workspace
{
  user: "free@example.com",
  whatsappDeviceSubscriptions: 0,
  otherProductsIgnored: 0,
  deviceLimit: 1,
  rateLimitPerMinute: 30,
  tier: "per_device",
  subscriptionBreakdown: []
}
```

---

## 📊 How to View Logs

### **Real-time Console (Development):**

```bash
# Logs appear automatically in console if NODE_ENV !== 'production'
npm start
```

### **View Log Files:**

```bash
# All logs
tail -f logs/combined.log

# Only OAuth-related logs
tail -f logs/combined.log | grep -E "OAuth|subscription|device"

# Only errors
tail -f logs/error.log

# Search for specific user
tail -f logs/combined.log | grep "customer@example.com"
```

### **Filter by Log Level:**

```bash
# Only info logs
tail -f logs/combined.log | grep '"level":"info"'

# Only errors
tail -f logs/combined.log | grep '"level":"error"'
```

---

## 🔍 Debug Mode

To see more detailed logs (including debug level), set:

```bash
LOG_LEVEL=debug
```

This will show additional `logger.debug()` calls like subscription filter checks.

---

## 📝 Log Format

All logs are in JSON format:

```json
{
  "level": "info",
  "message": "OAuth Login Flow Started",
  "code": "abc123...",
  "state": "xyz789...",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "service": "whatsapp-gateway"
}
```

This makes it easy to parse and search logs programmatically.

