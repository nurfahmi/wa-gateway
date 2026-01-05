# OAuth Product Synchronization Guide

## Required Parameters Between Membership System and WA-Gateway

This document explains which parameters must match between your OAuth membership system and WA-Gateway for proper product identification and device limit calculation.

---

## 📋 OAuth Introspect Response Format

Your OAuth `/oauth/introspect` endpoint **MUST** return subscriptions in this format:

```javascript
{
  "active": true,
  "user": {
    "id": "user_123",              // Required: Unique user identifier
    "email": "user@example.com",   // Required: User email
    "name": "User Name"            // Optional: User display name
  },
  "subscriptions": [               // Required: Array of subscriptions
    {
      // === PRODUCT IDENTIFICATION (Choose ONE method) ===
      
      // Method 1: Product Name Matching (Recommended)
      "product_name": "WhatsApp Device",  // ✅ Must match config
      
      // Method 2: Product ID Matching (Optional)
      "product_id": 1,                     // ✅ Must match config if used
      
      // === DEVICE LIMIT (Required for WhatsApp Device products) ===
      "device_limit": 6,                   // ✅ Required: Total devices (with bonus)
      
      // OR nested in metadata:
      "metadata": {
        "device_limit": 6                  // ✅ Alternative location
      },
      
      // === RATE LIMIT (Optional) ===
      "rate_limit_per_minute": 180,        // Optional: Custom rate limit
      
      // OR nested in metadata:
      "metadata": {
        "rate_limit_per_minute": 180       // Optional: Alternative location
      },
      
      // === OTHER FIELDS ===
      "expired_at": "2025-02-01T00:00:00Z", // Optional: ISO 8601 date string
      "product_id": 1,                       // Optional: Product identifier
      "metadata": {                         // Optional: Additional data
        "devices_purchased": 5,
        "bonus_devices": 1,
        "price_per_device": 50000
      }
    }
  ]
}
```

---

## 🔑 Required Matching Parameters

### **1. Product Name Matching** (Primary Method)

**Membership System:**
```javascript
{
  "product_name": "WhatsApp Device"  // Exact name in your database
}
```

**WA-Gateway Config:**
```bash
# .env file
WHATSAPP_DEVICE_PRODUCT_NAMES="WhatsApp Device,WA Device,WhatsApp Gateway Device"
```

**Matching Rules:**
- ✅ **Case-insensitive**: "WhatsApp Device" = "whatsapp device" = "WHATSAPP DEVICE"
- ✅ **Partial match**: "WhatsApp Device Pro" will match "WhatsApp Device"
- ✅ **Multiple names**: Any name in the comma-separated list will match

**Examples:**
| Membership Product Name | WA-Gateway Config | Match? |
|------------------------|-------------------|--------|
| "WhatsApp Device" | "WhatsApp Device" | ✅ Yes |
| "WA Device" | "WhatsApp Device,WA Device" | ✅ Yes |
| "WhatsApp Device Pro" | "WhatsApp Device" | ✅ Yes (partial) |
| "Premium Support" | "WhatsApp Device" | ❌ No |

---

### **2. Product ID Matching** (Optional Method)

**Membership System:**
```javascript
{
  "product_id": 1  // Product ID from your database
}
```

**WA-Gateway Config:**
```bash
# .env file
WHATSAPP_DEVICE_PRODUCT_IDS="1,5,10"
```

**Matching Rules:**
- ✅ **Exact match**: Product ID must be in the comma-separated list
- ✅ **Numeric only**: Only integer product IDs are supported
- ⚠️ **Optional**: If not configured, this method is skipped

**Examples:**
| Membership Product ID | WA-Gateway Config | Match? |
|---------------------|------------------|--------|
| 1 | "1,5,10" | ✅ Yes |
| 5 | "1,5,10" | ✅ Yes |
| 2 | "1,5,10" | ❌ No |
| null | "1,5,10" | ❌ No |

---

### **3. Device Limit Field** (Fallback Method)

**Membership System:**
```javascript
{
  "device_limit": 6  // Direct field
}
// OR
{
  "metadata": {
    "device_limit": 6  // Nested in metadata
  }
}
```

**Matching Rules:**
- ✅ **Any subscription with `device_limit`** will be counted
- ✅ **Flexible location**: Can be direct field or in `metadata` object
- ⚠️ **Fallback only**: Used if name/ID don't match

---

## 📊 Complete Example

### **Membership System Database:**

```sql
-- Products table
CREATE TABLE products (
  id INT PRIMARY KEY,
  name VARCHAR(255),
  price DECIMAL(10,2)
);

INSERT INTO products VALUES
(1, 'WhatsApp Device', 50000),
(2, 'Premium Support', 100000),
(3, 'API Access', 200000);

-- Subscriptions table
CREATE TABLE subscriptions (
  id INT PRIMARY KEY,
  user_id INT,
  product_id INT,
  device_limit INT,  -- Total devices (with bonus)
  expired_at DATETIME,
  metadata JSON
);
```

### **OAuth Introspect Endpoint (Membership System):**

```javascript
app.post('/oauth/introspect', async (req, res) => {
  const { token } = req.body;
  
  // Validate token and get user
  const session = await validateToken(token);
  const user = await getUser(session.user_id);
  
  // Get all active subscriptions
  const subscriptions = await db.query(`
    SELECT 
      s.product_id,
      p.name as product_name,
      s.device_limit,
      s.expired_at,
      s.metadata
    FROM subscriptions s
    JOIN products p ON s.product_id = p.id
    WHERE s.user_id = ? 
      AND s.status = 'active'
      AND s.expired_at > NOW()
  `, [user.id]);
  
  // Build response
  res.json({
    active: true,
    user: {
      id: user.id.toString(),
      email: user.email,
      name: user.name
    },
    subscriptions: subscriptions.map(sub => ({
      product_id: sub.product_id,
      product_name: sub.product_name,  // ✅ Must match WA-Gateway config
      device_limit: sub.device_limit,   // ✅ Required for WhatsApp Device
      expired_at: sub.expired_at.toISOString(),
      metadata: JSON.parse(sub.metadata || '{}')
    }))
  });
});
```

### **WA-Gateway Configuration:**

```bash
# .env file
WHATSAPP_DEVICE_PRODUCT_NAMES="WhatsApp Device,WA Device"
WHATSAPP_DEVICE_PRODUCT_IDS="1"  # Optional
```

---

## ✅ Parameter Checklist

Use this checklist to ensure your membership system matches WA-Gateway:

### **Required Fields:**
- [ ] `subscriptions` array exists in OAuth response
- [ ] `product_name` field in each subscription (for name matching)
- [ ] `device_limit` field in WhatsApp Device subscriptions
- [ ] Product name matches one of the names in `WHATSAPP_DEVICE_PRODUCT_NAMES`

### **Optional Fields:**
- [ ] `product_id` field (if using ID matching)
- [ ] `rate_limit_per_minute` field (for custom rate limits)
- [ ] `expired_at` field (ISO 8601 format)
- [ ] `metadata` object (for additional data)

### **Configuration:**
- [ ] `.env` file has `WHATSAPP_DEVICE_PRODUCT_NAMES` set
- [ ] Product names in membership match names in config (case-insensitive)
- [ ] If using product IDs, `WHATSAPP_DEVICE_PRODUCT_IDS` is set

---

## 🔍 Testing

### **Test Case 1: Product Name Match**

**Membership Response:**
```json
{
  "subscriptions": [{
    "product_name": "WhatsApp Device",
    "device_limit": 6
  }]
}
```

**WA-Gateway Config:**
```bash
WHATSAPP_DEVICE_PRODUCT_NAMES="WhatsApp Device"
```

**Result:** ✅ **6 devices** (matched by name)

---

### **Test Case 2: Product ID Match**

**Membership Response:**
```json
{
  "subscriptions": [{
    "product_id": 1,
    "product_name": "Custom Name",
    "device_limit": 6
  }]
}
```

**WA-Gateway Config:**
```bash
WHATSAPP_DEVICE_PRODUCT_IDS="1"
```

**Result:** ✅ **6 devices** (matched by ID)

---

### **Test Case 3: Fallback (device_limit exists)**

**Membership Response:**
```json
{
  "subscriptions": [{
    "product_name": "Unknown Product",
    "device_limit": 6
  }]
}
```

**WA-Gateway Config:**
```bash
WHATSAPP_DEVICE_PRODUCT_NAMES="WhatsApp Device"
```

**Result:** ✅ **6 devices** (matched by device_limit fallback)

---

### **Test Case 4: Multiple Subscriptions**

**Membership Response:**
```json
{
  "subscriptions": [
    {
      "product_name": "WhatsApp Device",
      "device_limit": 6
    },
    {
      "product_name": "WhatsApp Device",
      "device_limit": 6
    },
    {
      "product_name": "Premium Support",
      "device_limit": null
    }
  ]
}
```

**Result:** ✅ **12 devices** (6 + 6, Premium Support ignored)

---

## 🚨 Common Mistakes

### **Mistake 1: Product Name Mismatch**
```javascript
// ❌ Wrong: Name doesn't match config
{ "product_name": "WhatsApp License" }

// ✅ Correct: Name matches config
{ "product_name": "WhatsApp Device" }
```

### **Mistake 2: Missing device_limit**
```javascript
// ❌ Wrong: No device_limit field
{ "product_name": "WhatsApp Device" }

// ✅ Correct: Has device_limit
{ "product_name": "WhatsApp Device", "device_limit": 6 }
```

### **Mistake 3: Wrong Field Location**
```javascript
// ❌ Wrong: device_limit in wrong location
{ 
  "product_name": "WhatsApp Device",
  "data": { "device_limit": 6 }
}

// ✅ Correct: device_limit at root or metadata
{ 
  "product_name": "WhatsApp Device",
  "device_limit": 6
}
// OR
{
  "product_name": "WhatsApp Device",
  "metadata": { "device_limit": 6 }
}
```

---

## 📝 Summary

**Minimum Required Match:**
1. **Product Name** must match one name in `WHATSAPP_DEVICE_PRODUCT_NAMES` (case-insensitive)
   **OR**
2. **Product ID** must match one ID in `WHATSAPP_DEVICE_PRODUCT_IDS` (if configured)
   **OR**
3. **device_limit** field exists (fallback method)

**Required Field:**
- `device_limit`: Total number of devices (including bonuses)

**Optional Fields:**
- `rate_limit_per_minute`: Custom rate limit
- `expired_at`: Subscription expiry date
- `metadata`: Additional subscription data

