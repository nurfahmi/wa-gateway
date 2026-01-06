# Testing Message Sending API

This guide shows you how to test sending text, image, and file messages via the WhatsApp Gateway API.

## Prerequisites

1. **Server must be running**: `npm run dev` or `npm start`
2. **A connected WhatsApp device** (account) in your workspace
3. **Authentication**: Either session-based (via browser) or API key

## Method 1: Using Browser Session (Easiest)

### Step 1: Login via Browser

1. Open your browser and go to: `http://localhost:3000`
2. If dev-login is enabled (NODE_ENV=development), visit: `http://localhost:3000/dev-login`
3. You'll be redirected to the dashboard

### Step 2: Get Connected Devices

Open browser console (F12) and run:

```javascript
fetch('/api/whatsapp/sessions')
  .then(r => r.json())
  .then(data => {
    console.log('Devices:', data);
    window.accountId = data.data[0]?.id;
    console.log('Account ID:', window.accountId);
  });
```

### Step 3: Send Messages via Browser Console

Replace `YOUR_ACCOUNT_ID` and `+6281234567890` with your values:

#### Send Text Message:
```javascript
fetch('/api/whatsapp/messages/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    accountId: window.accountId, // or your account ID
    recipient: '+6281234567890',
    message: 'Hello! This is a test message from WhatsApp Gateway API'
  })
})
.then(r => r.json())
.then(data => console.log('Result:', data));
```

#### Send Image Message:
```javascript
const formData = new FormData();
formData.append('accountId', window.accountId);
formData.append('recipient', '+6281234567890');
formData.append('caption', 'Test image caption');

// Create a test image (blue square)
const canvas = document.createElement('canvas');
canvas.width = 200;
canvas.height = 200;
const ctx = canvas.getContext('2d');
ctx.fillStyle = 'blue';
ctx.fillRect(0, 0, 200, 200);
canvas.toBlob(blob => {
  formData.append('file', blob, 'test-image.png');
  
  fetch('/api/whatsapp/messages/send/image', {
    method: 'POST',
    body: formData
  })
  .then(r => r.json())
  .then(data => console.log('Result:', data));
});
```

#### Send Document/File Message:
```javascript
const formData = new FormData();
formData.append('accountId', window.accountId);
formData.append('recipient', '+6281234567890');
formData.append('fileName', 'test-document.txt');

// Create a test text file
const blob = new Blob(['This is a test document'], { type: 'text/plain' });
formData.append('file', blob, 'test-document.txt');

fetch('/api/whatsapp/messages/send/document', {
  method: 'POST',
  body: formData
})
.then(r => r.json())
.then(data => console.log('Result:', data));
```

## Method 2: Using API Key (Recommended for Automation)

### Step 1: Generate API Key

1. Login to dashboard: `http://localhost:3000/dashboard`
2. Go to "API Keys" section
3. Create a new API key
4. **Save the key immediately** (it's only shown once!)

### Step 2: Get Connected Devices

```bash
curl -X GET "http://localhost:3000/api/whatsapp/sessions" \
  -H "X-API-Key: YOUR_API_KEY_HERE" \
  -H "Content-Type: application/json"
```

### Step 3: Send Messages with API Key

Replace `YOUR_API_KEY`, `ACCOUNT_ID`, and `RECIPIENT`:

#### Send Text Message:
```bash
curl -X POST "http://localhost:3000/api/whatsapp/messages/send" \
  -H "X-API-Key: YOUR_API_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": ACCOUNT_ID,
    "recipient": "+6281234567890",
    "message": "Hello! This is a test text message"
  }'
```

#### Send Image Message:
```bash
curl -X POST "http://localhost:3000/api/whatsapp/messages/send/image" \
  -H "X-API-Key: YOUR_API_KEY_HERE" \
  -F "accountId=ACCOUNT_ID" \
  -F "recipient=+6281234567890" \
  -F "file=@/path/to/your/image.png" \
  -F "caption=This is a test image"
```

#### Send Document Message:
```bash
curl -X POST "http://localhost:3000/api/whatsapp/messages/send/document" \
  -H "X-API-Key: YOUR_API_KEY_HERE" \
  -F "accountId=ACCOUNT_ID" \
  -F "recipient=+6281234567890" \
  -F "file=@/path/to/your/document.pdf" \
  -F "fileName=document.pdf"
```

## Method 3: Using Test Scripts

### Option A: Bash Script (requires curl)

```bash
# Make sure NODE_ENV=development for dev-login to work
export NODE_ENV=development

# Run the test script
./test-messages.sh +6281234567890
```

### Option B: Python Script (requires requests and Pillow)

```bash
# Install dependencies
pip install requests pillow

# Run the test script
python3 test_messages.py +6281234567890
```

### Option C: Node.js Script

```bash
# Run the test script (text messages only)
node test_messages_node.js +6281234567890
```

## API Endpoints Reference

### Base URL
- Local: `http://localhost:3000`
- API Prefix: `/api/whatsapp`

### Message Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/whatsapp/messages/send` | POST | Send text message |
| `/api/whatsapp/messages/send/image` | POST | Send image message |
| `/api/whatsapp/messages/send/video` | POST | Send video message |
| `/api/whatsapp/messages/send/document` | POST | Send document/file message |
| `/api/whatsapp/sessions` | GET | List connected devices/accounts |

### Request Format

#### Text Message:
```json
{
  "accountId": 1,
  "recipient": "+6281234567890",
  "message": "Your message text here"
}
```

#### Image/Video/Document:
- Use `multipart/form-data`
- Required fields:
  - `accountId`: Account/device ID
  - `recipient`: Phone number in E.164 format
  - `file`: File to upload
- Optional fields:
  - `caption`: Caption for image/video
  - `fileName`: Custom filename for document

### Response Format

Success:
```json
{
  "success": true,
  "data": {
    "messageId": "3EB0123456789",
    "status": "sent",
    "sentAt": "2024-01-05T02:40:00.000Z"
  },
  "message": "Message sent successfully"
}
```

Error:
```json
{
  "success": false,
  "error": "Error message here"
}
```

## Troubleshooting

### "No connected devices found"
- Make sure you have at least one WhatsApp account connected
- Visit dashboard and check Accounts section
- Create a new device if needed

### "Authentication required"
- Make sure you're logged in (browser session) OR
- Include `X-API-Key` header with valid API key

### "Invalid API token"
- Check that your API key is correct
- Make sure API key hasn't been revoked
- For session auth, make sure cookies are being sent

### "Device not connected"
- Check device status: `GET /api/whatsapp/devices/:id/status`
- Device must be in "connected" or "authenticated" state
- You may need to scan QR code to connect

### Dev-login returns 404
- Make sure `NODE_ENV=development`
- Check server logs to see if dev routes are loaded
- Alternative: Use browser to login normally

## Quick Test Checklist

- [ ] Server is running (`npm run dev`)
- [ ] At least one device is connected
- [ ] You have authentication (session or API key)
- [ ] You know the account ID
- [ ] You have a test recipient phone number
- [ ] Test text message first (simplest)
- [ ] Then test image/document messages

## Example: Complete Test Flow

```bash
# 1. Get API key from dashboard (save it)
API_KEY="gw_live_..."

# 2. Get connected devices
curl -X GET "http://localhost:3000/api/whatsapp/sessions" \
  -H "X-API-Key: $API_KEY" | jq

# 3. Extract account ID (example: account ID is 1)
ACCOUNT_ID=1
RECIPIENT="+6281234567890"

# 4. Send text message
curl -X POST "http://localhost:3000/api/whatsapp/messages/send" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"accountId\": $ACCOUNT_ID,
    \"recipient\": \"$RECIPIENT\",
    \"message\": \"Test message at $(date)\"
  }" | jq

# 5. Send image (if you have an image file)
curl -X POST "http://localhost:3000/api/whatsapp/messages/send/image" \
  -H "X-API-Key: $API_KEY" \
  -F "accountId=$ACCOUNT_ID" \
  -F "recipient=$RECIPIENT" \
  -F "file=@test-image.png" \
  -F "caption=Test image" | jq
```

## Notes

- Phone numbers must be in E.164 format: `+[country code][number]`
- Example: `+6281234567890` (Indonesia)
- File size limit: 16MB
- Supported image formats: JPEG, PNG, GIF, WebP
- Supported document formats: PDF, DOC, DOCX, TXT, ZIP
- Rate limiting applies based on your subscription tier





