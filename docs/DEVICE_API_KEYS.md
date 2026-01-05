# Device API Keys Guide

## Overview

WA-Gateway now supports two types of API keys:

1. **Workspace API Keys** - Access all devices in a workspace (admin-level)
2. **Device API Keys** - Device-specific keys for individual WhatsApp accounts (per-device access)

This guide focuses on Device API Keys, which allow each connected WhatsApp device to have its own isolated API key for REST API access.

## Key Features

- ✅ Auto-generated when a WhatsApp account is created
- ✅ Device-specific authentication
- ✅ Automatic workspace context binding
- ✅ Regeneration capability
- ✅ Usage tracking (last used timestamp)
- ✅ Secure hash storage

## API Key Formats

### Device API Key
```
dev_<workspace_id>_<random_string>
Example: dev_1_abc123xyz789def456ghi789
```

### Workspace API Key
```
gw_live_<random_string>  (production)
gw_test_<random_string>  (testing)
Example: gw_live_xyz789abc456def123
```

## Getting Device API Keys

### 1. On Account Creation

When you create a new WhatsApp account, the device API key is automatically generated and displayed **once**:

```javascript
POST /api/accounts
Headers: {
  "Authorization": "Bearer <oauth_token>",
  "Content-Type": "application/json"
}
Body: {
  "provider": "baileys",
  "displayName": "My Business Account",
  "baileysDisclaimerAccepted": true
}

Response: {
  "success": true,
  "data": {
    "id": 1,
    "provider": "baileys",
    "status": "connecting",
    "displayName": "My Business Account",
    "deviceApiKey": "dev_1_abc123xyz789def456ghi789",  // ⚠️ Only shown once!
    "deviceApiKeyPrefix": "dev_1_abc123xyz789...",
    "qrCode": "data:image/png;base64,...",
    ...
  }
}
```

**Important:** Save the `deviceApiKey` immediately. It will never be shown again in full.

### 2. Via Accounts Page

- Navigate to `/accounts`
- Each device shows its key prefix: `dev_1_abc123xyz789...`
- Use "Regen Key" button to generate a new key (old key will be invalidated)

### 3. Via API Keys Page

- Navigate to `/api-keys`
- See all device keys with their prefixes and last used timestamps
- Manage keys from the Accounts page

## Using Device API Keys

### Basic Authentication

Include the device API key in the `X-API-Key` header:

```javascript
const response = await fetch('https://your-domain.com/api/whatsapp/send', {
  method: 'POST',
  headers: {
    'X-API-Key': 'dev_1_abc123xyz789def456ghi789',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    recipient: '628123456789',
    message: 'Hello World!'
  })
});
```

### No Session ID Required

When using a device API key, you don't need to specify `sessionId` - it's automatically determined from the key:

```javascript
// ✅ Device API Key (simpler)
{
  "recipient": "628123456789",
  "message": "Hello!"
}

// vs Workspace API Key (requires sessionId)
{
  "sessionId": "user_123_device_primary",
  "recipient": "628123456789",
  "message": "Hello!"
}
```

### Integration Examples

#### Node.js / JavaScript

```javascript
class WhatsAppClient {
  constructor(deviceApiKey) {
    this.apiKey = deviceApiKey;
    this.baseUrl = 'https://your-domain.com/api/whatsapp';
  }

  async sendMessage(recipient, message) {
    const response = await fetch(`${this.baseUrl}/send`, {
      method: 'POST',
      headers: {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ recipient, message })
    });
    return response.json();
  }

  async sendImage(recipient, fileId, caption) {
    const response = await fetch(`${this.baseUrl}/send/image`, {
      method: 'POST',
      headers: {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ recipient, fileId, caption })
    });
    return response.json();
  }
}

// Usage
const client = new WhatsAppClient('dev_1_abc123xyz789def456ghi789');
await client.sendMessage('628123456789', 'Hello from Node.js!');
```

#### Python

```python
import requests

class WhatsAppClient:
    def __init__(self, device_api_key):
        self.api_key = device_api_key
        self.base_url = 'https://your-domain.com/api/whatsapp'
    
    def send_message(self, recipient, message):
        response = requests.post(
            f'{self.base_url}/send',
            headers={
                'X-API-Key': self.api_key,
                'Content-Type': 'application/json'
            },
            json={
                'recipient': recipient,
                'message': message
            }
        )
        return response.json()

# Usage
client = WhatsAppClient('dev_1_abc123xyz789def456ghi789')
client.send_message('628123456789', 'Hello from Python!')
```

#### PHP

```php
<?php
class WhatsAppClient {
    private $apiKey;
    private $baseUrl;
    
    public function __construct($deviceApiKey) {
        $this->apiKey = $deviceApiKey;
        $this->baseUrl = 'https://your-domain.com/api/whatsapp';
    }
    
    public function sendMessage($recipient, $message) {
        $ch = curl_init($this->baseUrl . '/send');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'X-API-Key: ' . $this->apiKey,
            'Content-Type: application/json'
        ]);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
            'recipient' => $recipient,
            'message' => $message
        ]));
        
        $response = curl_exec($ch);
        curl_close($ch);
        
        return json_decode($response, true);
    }
}

// Usage
$client = new WhatsAppClient('dev_1_abc123xyz789def456ghi789');
$client->sendMessage('628123456789', 'Hello from PHP!');
?>
```

## Key Management

### Regenerating a Device API Key

```javascript
POST /api/accounts/:id/regenerate-key
Headers: {
  "Authorization": "Bearer <oauth_token>"
}

Response: {
  "success": true,
  "data": {
    "deviceApiKey": "dev_1_new123xyz789def456ghi789",  // New key
    "prefix": "dev_1_new123xyz789..."
  },
  "message": "Device API key regenerated successfully"
}
```

**Note:** The old key will be immediately invalidated.

### When to Regenerate

- Key compromised or exposed
- Regular security rotation (recommended every 90 days)
- Device ownership transfer
- Suspected unauthorized access

## Security Best Practices

### 1. Store Keys Securely

```javascript
// ✅ Good: Environment variables
const DEVICE_API_KEY = process.env.WHATSAPP_DEVICE_API_KEY;

// ✅ Good: Secure configuration management
const config = require('./secure-config');
const apiKey = config.whatsapp.deviceApiKey;

// ❌ Bad: Hardcoded
const apiKey = 'dev_1_abc123xyz789def456ghi789';

// ❌ Bad: Client-side code
const apiKey = document.getElementById('api-key').value;
```

### 2. Use HTTPS Only

```javascript
// ✅ Always use HTTPS in production
const baseUrl = 'https://your-domain.com/api/whatsapp';

// ❌ Never use HTTP for API calls
const baseUrl = 'http://your-domain.com/api/whatsapp';
```

### 3. Rotate Keys Regularly

```javascript
// Implement automatic key rotation
async function rotateDeviceKey(accountId) {
  const response = await fetch(`/api/accounts/${accountId}/regenerate-key`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
  
  const { deviceApiKey } = await response.json();
  
  // Update configuration
  await updateSecureConfig({ deviceApiKey });
  
  console.log('Device API key rotated successfully');
}

// Schedule rotation every 90 days
setInterval(() => rotateDeviceKey(accountId), 90 * 24 * 60 * 60 * 1000);
```

### 4. Monitor Usage

- Check "Last Used" timestamp on API Keys page
- Set up alerts for unusual activity
- Review API access logs regularly

## Troubleshooting

### Invalid Device API Key

**Error:** `401 Unauthorized - Invalid device API key`

**Causes:**
- Key not found in database
- Key belongs to disconnected device
- Key has been regenerated
- Typo in the key

**Solution:**
1. Verify the key is correct
2. Check device status is "connected"
3. Regenerate key if needed

### Device Not Connected

**Error:** `401 Unauthorized - Device not connected`

**Cause:** The WhatsApp device associated with this key is not connected.

**Solution:**
1. Go to `/accounts`
2. Check device status
3. Reconnect device if needed
4. Try again once device is "connected"

### Key Format Invalid

**Error:** `401 Unauthorized - Invalid API key format`

**Cause:** The key doesn't start with `dev_`, `gw_live_`, or `gw_test_`

**Solution:**
- Verify you're using the correct key
- Check for extra spaces or characters
- Ensure you copied the full key

## API Endpoints Supporting Device Keys

All WhatsApp API endpoints support device API keys:

- ✅ `POST /api/whatsapp/send` - Send text message
- ✅ `POST /api/whatsapp/send/image` - Send image
- ✅ `POST /api/whatsapp/send/document` - Send document
- ✅ `POST /api/whatsapp/send/video` - Send video
- ✅ `POST /api/whatsapp/send/audio` - Send audio
- ✅ `GET /api/whatsapp/contacts` - Get contacts
- ✅ `GET /api/whatsapp/messages` - Get messages

## Comparison: Workspace vs Device Keys

| Feature | Workspace API Key | Device API Key |
|---------|------------------|----------------|
| Format | `gw_live_*` or `gw_test_*` | `dev_*` |
| Access Level | All devices in workspace | Single device only |
| Requires sessionId | Yes | No (automatic) |
| Use Case | Admin/dashboard integration | Per-device integration |
| Security | Higher privileges | Isolated per device |
| Created | Manually via dashboard | Auto on device creation |
| Best For | Multi-device management | Customer integrations |

## FAQs

**Q: Can I use both workspace and device keys together?**  
A: Yes, but not in the same request. Choose one based on your use case.

**Q: What happens to the device key when I delete a device?**  
A: The device key is automatically invalidated and deleted.

**Q: Can I have multiple keys per device?**  
A: No, each device has exactly one API key. Regenerate to get a new one.

**Q: Are device keys free?**  
A: Yes, device API keys are included with your subscription at no extra cost.

**Q: How long do device keys last?**  
A: Device keys never expire, but we recommend rotating them every 90 days.

**Q: Can I share device keys with customers?**  
A: Yes! This is the recommended way for customers to integrate with their specific device.

## Support

For issues or questions:
- Check the main documentation at `/docs/API.md`
- Review the integration guide at `/reference document/baileys/SAAS_INTEGRATION_GUIDE.md`
- Contact support with your device key prefix (not the full key)

---

**Last Updated:** 2026-01-04  
**Version:** 1.0

