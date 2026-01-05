# WhatsApp API - cURL Commands Reference

Extracted from `public/index.html` - Working examples with request/response formats.

## Configuration Variables

```bash
# Set these variables before running commands
API_BASE_URL="http://localhost:3000/api/whatsapp"
API_TOKEN="test123"
```

---

## 1. Device Management

### 1.1 Create New Device
```bash
curl -X POST "${API_BASE_URL}/devices" \
  -H "Content-Type: application/json" \
  -H "X-API-Token: ${API_TOKEN}" \
  -d '{
    "userId": "user-123-uuid",
    "alias": "My WhatsApp Device"
  }'
```

**Response:**
```json
{
  "success": true,
  "device": {
    "id": 1,
    "userId": "user-123-uuid",
    "alias": "My WhatsApp Device",
    "sessionId": "session_abc123",
    "apiKey": "generated-api-key-here",
    "status": "pending"
  },
  "qr": "base64-qr-code-or-null"
}
```

### 1.2 Get All Sessions
```bash
curl -X GET "${API_BASE_URL}/sessions" \
  -H "X-API-Token: ${API_TOKEN}" \
  -H "Accept: application/json"
```

**Response:**
```json
{
  "success": true,
  "sessions": [
    {
      "id": 1,
      "userId": "user-123-uuid",
      "alias": "My Device",
      "sessionId": "session_abc123",
      "status": "connected",
      "phoneNumber": "628123456789",
      "apiKey": "device-api-key"
    }
  ]
}
```

### 1.3 Get User's Devices
```bash
USER_ID="user-123-uuid"
curl -X GET "${API_BASE_URL}/users/${USER_ID}/devices" \
  -H "X-API-Token: ${API_TOKEN}" \
  -H "Accept: application/json"
```

**Response:**
```json
{
  "success": true,
  "devices": [
    {
      "id": 1,
      "userId": "user-123-uuid",
      "alias": "Device 1",
      "sessionId": "session_abc123",
      "status": "connected",
      "phoneNumber": "628123456789",
      "apiKey": "device-api-key"
    }
  ]
}
```

### 1.4 Login Device (Get QR Code)
```bash
DEVICE_ID=1
curl -X POST "${API_BASE_URL}/devices/${DEVICE_ID}/login" \
  -H "Content-Type: application/json" \
  -H "X-API-Token: ${API_TOKEN}"
```

**Response:**
```json
{
  "success": true,
  "device": {
    "id": 1,
    "sessionId": "session_abc123",
    "status": "pending"
  },
  "qr": "qr-code-string-for-scanning"
}
```

### 1.5 Logout Device
```bash
DEVICE_ID=1
curl -X POST "${API_BASE_URL}/devices/${DEVICE_ID}/logout" \
  -H "Content-Type: application/json" \
  -H "X-API-Token: ${API_TOKEN}"
```

**Response:**
```json
{
  "success": true,
  "message": "Device logged out successfully"
}
```

### 1.6 Delete Device
```bash
DEVICE_ID=1
curl -X DELETE "${API_BASE_URL}/devices/${DEVICE_ID}" \
  -H "X-API-Token: ${API_TOKEN}"
```

**Response:**
```json
{
  "success": true,
  "message": "Device deleted successfully"
}
```

### 1.7 Get QR Code for Device
```bash
DEVICE_ID=1
curl -X GET "${API_BASE_URL}/devices/${DEVICE_ID}/qr" \
  -H "X-API-Token: ${API_TOKEN}"
```

**Response:**
```json
{
  "success": true,
  "qrCode": "data:image/png;base64,..."
}
```

### 1.8 Cancel Session
```bash
SESSION_ID="session_abc123"
curl -X POST "${API_BASE_URL}/sessions/${SESSION_ID}/cancel" \
  -H "X-API-Token: ${API_TOKEN}"
```

---

## 2. Messaging

### 2.1 Send Text Message (with Session ID)
```bash
curl -X POST "${API_BASE_URL}/send" \
  -H "Content-Type: application/json" \
  -H "X-API-Token: ${API_TOKEN}" \
  -d '{
    "sessionId": "session_abc123",
    "recipient": "628123456789",
    "message": "Hello from API!"
  }'
```

**Response:**
```json
{
  "success": true,
  "messageId": "msg_xyz789",
  "status": "sent"
}
```

### 2.2 Send Text Message (with Device API Key)
```bash
DEVICE_API_KEY="your-device-api-key"
curl -X POST "${API_BASE_URL}/send" \
  -H "Content-Type: application/json" \
  -H "X-API-Token: ${API_TOKEN}" \
  -H "X-Device-API-Key: ${DEVICE_API_KEY}" \
  -d '{
    "recipient": "628123456789",
    "message": "Hello from API Key!"
  }'
```

### 2.3 Send Image Message (with File ID)
```bash
curl -X POST "${API_BASE_URL}/send/image" \
  -H "Content-Type: application/json" \
  -H "X-API-Token: ${API_TOKEN}" \
  -d '{
    "sessionId": "session_abc123",
    "recipient": "628123456789",
    "fileId": "file-uuid-here",
    "caption": "Check out this image!"
  }'
```

### 2.4 Send Image Message (with File Upload & API Key)
```bash
DEVICE_API_KEY="your-device-api-key"
curl -X POST "${API_BASE_URL}/send/image" \
  -H "X-API-Token: ${API_TOKEN}" \
  -H "X-Device-API-Key: ${DEVICE_API_KEY}" \
  -F "recipient=628123456789" \
  -F "file=@/path/to/image.jpg" \
  -F "caption=Image caption here"
```

### 2.5 Send Video Message (with File ID)
```bash
curl -X POST "${API_BASE_URL}/send/video" \
  -H "Content-Type: application/json" \
  -H "X-API-Token: ${API_TOKEN}" \
  -d '{
    "sessionId": "session_abc123",
    "recipient": "628123456789",
    "fileId": "video-file-uuid",
    "caption": "Check out this video!"
  }'
```

### 2.6 Send Document Message (with File ID)
```bash
curl -X POST "${API_BASE_URL}/send/document" \
  -H "Content-Type: application/json" \
  -H "X-API-Token: ${API_TOKEN}" \
  -d '{
    "sessionId": "session_abc123",
    "recipient": "628123456789",
    "fileId": "document-file-uuid",
    "fileName": "report.pdf"
  }'
```

### 2.7 Get Messages
```bash
SESSION_ID="session_abc123"
LIMIT=50
OFFSET=0
curl -X GET "${API_BASE_URL}/messages?sessionId=${SESSION_ID}&limit=${LIMIT}&offset=${OFFSET}" \
  -H "X-API-Token: ${API_TOKEN}"
```

**Response:**
```json
{
  "success": true,
  "messages": [
    {
      "id": 1,
      "messageId": "msg_xyz789",
      "sessionId": "session_abc123",
      "direction": "outgoing",
      "recipient": "628123456789",
      "message": "Hello!",
      "timestamp": "2025-12-09T10:30:00Z"
    }
  ]
}
```

---

## 3. Contacts, Chats & Groups

### 3.1 Get Contacts by Device
```bash
DEVICE_ID=1
curl -X GET "${API_BASE_URL}/devices/${DEVICE_ID}/contacts" \
  -H "X-API-Token: ${API_TOKEN}"
```

**Response:**
```json
{
  "success": true,
  "contacts": [
    {
      "id": "628123456789@s.whatsapp.net",
      "name": "John Doe",
      "phoneNumber": "628123456789"
    }
  ]
}
```

### 3.2 Get Chats by Device
```bash
DEVICE_ID=1
curl -X GET "${API_BASE_URL}/devices/${DEVICE_ID}/chats" \
  -H "X-API-Token: ${API_TOKEN}"
```

**Response:**
```json
{
  "success": true,
  "chats": [
    {
      "id": "628123456789@s.whatsapp.net",
      "name": "John Doe",
      "unreadCount": 5,
      "lastMessage": "2025-12-09T10:30:00Z"
    }
  ]
}
```

### 3.3 Get Groups by Device
```bash
DEVICE_ID=1
curl -X GET "${API_BASE_URL}/devices/${DEVICE_ID}/groups" \
  -H "X-API-Token: ${API_TOKEN}"
```

**Response:**
```json
{
  "success": true,
  "groups": [
    {
      "id": "123456789@g.us",
      "subject": "Family Group",
      "participants": ["628111111111@s.whatsapp.net"],
      "desc": "Our family chat"
    }
  ]
}
```

### 3.4 Get Contacts by User ID
```bash
USER_ID="user-123-uuid"
curl -X GET "${API_BASE_URL}/users/${USER_ID}/contacts" \
  -H "X-API-Token: ${API_TOKEN}"
```

**Response:**
```json
{
  "success": true,
  "contacts": [
    {
      "contactName": "John Doe",
      "whatsappName": "John",
      "phoneNumber": "628123456789",
      "source": "synced",
      "lastSeen": "2025-12-09T10:30:00Z"
    }
  ]
}
```

### 3.5 Sync WhatsApp Data
```bash
DEVICE_ID=1
curl -X POST "${API_BASE_URL}/devices/${DEVICE_ID}/sync" \
  -H "Content-Type: application/json" \
  -H "X-API-Token: ${API_TOKEN}"
```

**Response:**
```json
{
  "success": true,
  "message": "WhatsApp data synced successfully",
  "synced": {
    "contacts": 50,
    "chats": 30,
    "groups": 5
  }
}
```

### 3.6 Get Baileys Store Contacts
```bash
DEVICE_ID=1
curl -X GET "${API_BASE_URL}/devices/${DEVICE_ID}/contacts/baileys-store" \
  -H "X-API-Token: ${API_TOKEN}"
```

**Response:**
```json
{
  "success": true,
  "contacts": [
    {
      "id": "628123456789@s.whatsapp.net",
      "name": "John Doe",
      "notify": "John"
    }
  ]
}
```

### 3.7 Get Baileys Store Chats
```bash
DEVICE_ID=1
curl -X GET "${API_BASE_URL}/devices/${DEVICE_ID}/chats/baileys-store" \
  -H "X-API-Token: ${API_TOKEN}"
```

**Response:**
```json
{
  "success": true,
  "chats": [
    {
      "id": "628123456789@s.whatsapp.net",
      "conversationTimestamp": 1704067200,
      "unreadCount": 0
    }
  ]
}
```

### 3.8 Get Group Members
```bash
DEVICE_ID=1
GROUP_ID="123456789@g.us"
curl -X GET "${API_BASE_URL}/devices/${DEVICE_ID}/groups/${GROUP_ID}/members" \
  -H "X-API-Token: ${API_TOKEN}"
```

**Response:**
```json
{
  "success": true,
  "groupId": "123456789@g.us",
  "members": [
    {
      "id": "628111111111@s.whatsapp.net",
      "admin": "admin"
    }
  ]
}
```

### 3.9 Get Profile Picture
```bash
DEVICE_ID=1
JID="628123456789@s.whatsapp.net"
curl -X GET "${API_BASE_URL}/devices/${DEVICE_ID}/profile/${JID}" \
  -H "X-API-Token: ${API_TOKEN}"
```

**Response:**
```json
{
  "success": true,
  "profilePicture": "https://..."
}
```

### 3.10 Get Presence Status
```bash
DEVICE_ID=1
JID="628123456789@s.whatsapp.net"
curl -X GET "${API_BASE_URL}/devices/${DEVICE_ID}/presence/${JID}" \
  -H "X-API-Token: ${API_TOKEN}"
```

**Response:**
```json
{
  "success": true,
  "presence": "available"
}
```

### 3.11 Get Business Profile
```bash
DEVICE_ID=1
JID="628123456789@s.whatsapp.net"
curl -X GET "${API_BASE_URL}/devices/${DEVICE_ID}/business/${JID}" \
  -H "X-API-Token: ${API_TOKEN}"
```

**Response:**
```json
{
  "success": true,
  "businessProfile": {
    "description": "Official Business Account",
    "email": "contact@business.com",
    "website": ["https://business.com"]
  }
}
```

---

## 4. File Management

### 4.1 Upload File
```bash
curl -X POST "${API_BASE_URL}/files/upload" \
  -H "X-API-Token: ${API_TOKEN}" \
  -F "file=@/path/to/image.jpg" \
  -F "userId=user-123-uuid" \
  -F "fileType=image" \
  -F "description=Product photo"
```

**Response:**
```json
{
  "success": true,
  "file": {
    "id": "file-uuid-123",
    "userId": "user-123-uuid",
    "fileType": "image",
    "originalName": "image.jpg",
    "storedName": "1234567890_uuid.jpg",
    "filePath": "/uploads/users/user-123-uuid/image.jpg",
    "size": 102400,
    "mimeType": "image/jpeg",
    "description": "Product photo",
    "previewUrl": "http://localhost:3000/api/whatsapp/files/file-uuid-123/preview",
    "createdAt": "2025-12-01T10:00:00Z"
  }
}
```

### 4.2 List Files
```bash
USER_ID="user-123-uuid"
curl -X GET "${API_BASE_URL}/files?userId=${USER_ID}" \
  -H "X-API-Token: ${API_TOKEN}"
```

**With Filters:**
```bash
# Filter by file type
curl -X GET "${API_BASE_URL}/files?userId=${USER_ID}&fileType=image" \
  -H "X-API-Token: ${API_TOKEN}"

# With pagination
curl -X GET "${API_BASE_URL}/files?userId=${USER_ID}&limit=20&offset=0" \
  -H "X-API-Token: ${API_TOKEN}"
```

**Response:**
```json
{
  "success": true,
  "files": [
    {
      "id": "file-uuid-123",
      "originalName": "photo.jpg",
      "fileType": "image",
      "size": 102400,
      "description": "Product photo",
      "usageCount": 5,
      "createdAt": "2025-12-01T10:00:00Z",
      "previewUrl": "http://localhost:3000/api/whatsapp/files/file-uuid-123/preview"
    }
  ],
  "total": 50,
  "limit": 20,
  "offset": 0
}
```

### 4.3 Search Files
```bash
USER_ID="user-123-uuid"
SEARCH="product"
curl -X GET "${API_BASE_URL}/files/search?userId=${USER_ID}&query=${SEARCH}" \
  -H "X-API-Token: ${API_TOKEN}"
```

**Response:**
```json
{
  "success": true,
  "files": [
    {
      "id": "file-uuid-123",
      "originalName": "product-photo.jpg",
      "description": "Product catalog image",
      "fileType": "image"
    }
  ]
}
```

### 4.4 Get File Details
```bash
FILE_ID="file-uuid-123"
curl -X GET "${API_BASE_URL}/files/${FILE_ID}" \
  -H "X-API-Token: ${API_TOKEN}"
```

**Response:**
```json
{
  "success": true,
  "file": {
    "id": "file-uuid-123",
    "userId": "user-123-uuid",
    "fileType": "image",
    "originalName": "photo.jpg",
    "size": 102400,
    "mimeType": "image/jpeg",
    "description": "Product photo",
    "usageCount": 5,
    "createdAt": "2025-12-01T10:00:00Z",
    "previewUrl": "http://localhost:3000/api/whatsapp/files/file-uuid-123/preview"
  }
}
```

### 4.5 Update File Metadata
```bash
FILE_ID="file-uuid-123"
curl -X PUT "${API_BASE_URL}/files/${FILE_ID}" \
  -H "X-API-Token: ${API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Updated product photo",
    "expiresAt": "2025-12-31T23:59:59Z"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "File updated successfully",
  "file": {
    "id": "file-uuid-123",
    "description": "Updated product photo",
    "expiresAt": "2025-12-31T23:59:59Z"
  }
}
```

### 4.6 Delete File
```bash
FILE_ID="file-uuid-123"
curl -X DELETE "${API_BASE_URL}/files/${FILE_ID}" \
  -H "X-API-Token: ${API_TOKEN}"
```

**Response:**
```json
{
  "success": true,
  "message": "File deleted successfully"
}
```

### 4.7 Bulk Delete Files
```bash
curl -X DELETE "${API_BASE_URL}/files/bulk" \
  -H "X-API-Token: ${API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "fileIds": ["file-uuid-123", "file-uuid-456", "file-uuid-789"]
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "3 files deleted successfully",
  "deletedCount": 3
}
```

### 4.8 Get User File Statistics
```bash
USER_ID="user-123-uuid"
curl -X GET "${API_BASE_URL}/files/users/${USER_ID}/stats" \
  -H "X-API-Token: ${API_TOKEN}"
```

**Response:**
```json
{
  "success": true,
  "stats": {
    "totalFiles": 50,
    "totalSize": 5242880,
    "byType": {
      "image": 30,
      "video": 10,
      "document": 10
    },
    "totalUsageCount": 150
  }
}
```

### 4.9 Get File Preview (PUBLIC)
```bash
FILE_ID="file-uuid-123"
curl -X GET "${API_BASE_URL}/files/${FILE_ID}/preview" \
  --output preview.jpg
```

**Note:** This endpoint is public and can be used directly in `<img>` tags:
```html
<img src="http://localhost:3000/api/whatsapp/files/file-uuid-123/preview" />
```

---

## 5. Device Settings

### 5.1 Get AI Settings
```bash
DEVICE_ID=1
curl -X GET "${API_BASE_URL}/devices/${DEVICE_ID}/settings/ai" \
  -H "X-API-Token: ${API_TOKEN}"
```

**Response:**
```json
{
  "success": true,
  "aiEnabled": true,
  "aiAutoReply": true,
  "aiBotName": "Assistant Bot"
}
```

### 5.2 Update AI Settings
```bash
DEVICE_ID=1
curl -X PUT "${API_BASE_URL}/devices/${DEVICE_ID}/settings/ai" \
  -H "Content-Type: application/json" \
  -H "X-API-Token: ${API_TOKEN}" \
  -d '{
    "aiEnabled": true,
    "aiAutoReply": true,
    "aiBotName": "My AI Assistant",
    "aiMaxTokens": 500,
    "aiTemperature": 0.7,
    "aiLanguage": "en"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "AI settings updated successfully"
}
```

### 5.3 Get Webhook Settings
```bash
DEVICE_ID=1
curl -X GET "${API_BASE_URL}/devices/${DEVICE_ID}/settings/webhook" \
  -H "X-API-Token: ${API_TOKEN}"
```

**Response:**
```json
{
  "success": true,
  "webhookEnabled": true,
  "webhookUrl": "https://your-webhook-url.com/webhook"
}
```

### 5.4 Update Webhook Settings
```bash
DEVICE_ID=1
curl -X PUT "${API_BASE_URL}/devices/${DEVICE_ID}/settings/webhook" \
  -H "Content-Type: application/json" \
  -H "X-API-Token: ${API_TOKEN}" \
  -d '{
    "webhookEnabled": true,
    "webhookUrl": "https://your-webhook-url.com/webhook",
    "webhookEvents": ["message", "connection", "qr"]
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Webhook settings updated successfully"
}
```

---

## 6. Message Logging & Status

### 6.1 Get User Message Logs
```bash
USER_ID="user-123-uuid"
curl -X GET "${API_BASE_URL}/users/${USER_ID}/message-logs?limit=50&offset=0" \
  -H "X-API-Token: ${API_TOKEN}"
```

**Response:**
```json
{
  "success": true,
  "logs": [
    {
      "id": 1,
      "messageId": "msg_xyz789",
      "deviceId": 1,
      "sessionId": "session_abc123",
      "direction": "outgoing",
      "recipient": "628123456789",
      "message": "Hello!",
      "status": "delivered",
      "timestamp": "2025-12-09T10:30:00Z"
    }
  ],
  "total": 500,
  "limit": 50,
  "offset": 0
}
```

### 6.2 Get Message Status
```bash
MESSAGE_ID="msg_xyz789"
curl -X GET "${API_BASE_URL}/messages/${MESSAGE_ID}/status" \
  -H "X-API-Token: ${API_TOKEN}"
```

**Response:**
```json
{
  "success": true,
  "messageId": "msg_xyz789",
  "status": "delivered",
  "timestamp": "2025-12-09T10:30:00Z",
  "deliveredAt": "2025-12-09T10:30:05Z",
  "readAt": "2025-12-09T10:31:00Z"
}
```

### 6.3 Get User Sending Statistics
```bash
USER_ID="user-123-uuid"
curl -X GET "${API_BASE_URL}/users/${USER_ID}/sending-stats" \
  -H "X-API-Token: ${API_TOKEN}"
```

**Response:**
```json
{
  "success": true,
  "stats": {
    "totalSent": 1000,
    "totalDelivered": 950,
    "totalRead": 800,
    "totalFailed": 50,
    "byType": {
      "text": 600,
      "image": 250,
      "video": 100,
      "document": 50
    },
    "last24Hours": 50,
    "last7Days": 300,
    "last30Days": 1000
  }
}
```

### 6.4 Resend Message
```bash
MESSAGE_ID="msg_xyz789"
curl -X POST "${API_BASE_URL}/messages/${MESSAGE_ID}/resend" \
  -H "Content-Type: application/json" \
  -H "X-API-Token: ${API_TOKEN}"
```

**Response:**
```json
{
  "success": true,
  "messageId": "msg_new123",
  "status": "sent",
  "message": "Message resent successfully"
}
```

### 6.5 Send Bulk Files
```bash
curl -X POST "${API_BASE_URL}/send/bulk" \
  -H "Content-Type: application/json" \
  -H "X-API-Token: ${API_TOKEN}" \
  -d '{
    "sessionId": "session_abc123",
    "recipients": ["628123456789", "628987654321"],
    "fileIds": ["file-uuid-123", "file-uuid-456"],
    "caption": "Bulk file sharing"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Bulk files sent successfully",
  "results": [
    {
      "recipient": "628123456789",
      "status": "sent",
      "messageIds": ["msg_1", "msg_2"]
    },
    {
      "recipient": "628987654321",
      "status": "sent",
      "messageIds": ["msg_3", "msg_4"]
    }
  ]
}
```

### 6.6 Send Mixed Media
```bash
curl -X POST "${API_BASE_URL}/send/mixed" \
  -H "Content-Type: application/json" \
  -H "X-API-Token: ${API_TOKEN}" \
  -d '{
    "sessionId": "session_abc123",
    "recipient": "628123456789",
    "media": [
      {"type": "image", "fileId": "file-uuid-123", "caption": "Photo 1"},
      {"type": "video", "fileId": "file-uuid-456", "caption": "Video 1"},
      {"type": "document", "fileId": "file-uuid-789", "fileName": "document.pdf"}
    ]
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Mixed media sent successfully",
  "messageIds": ["msg_1", "msg_2", "msg_3"]
}
```

### 6.7 Send Batch Files
```bash
curl -X POST "${API_BASE_URL}/send/batch" \
  -H "Content-Type: application/json" \
  -H "X-API-Token: ${API_TOKEN}" \
  -d '{
    "sessionId": "session_abc123",
    "batches": [
      {
        "recipient": "628123456789",
        "fileIds": ["file-uuid-123", "file-uuid-456"]
      },
      {
        "recipient": "628987654321",
        "fileIds": ["file-uuid-789"]
      }
    ]
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Batch files sent successfully",
  "results": [
    {
      "recipient": "628123456789",
      "status": "sent",
      "messageIds": ["msg_1", "msg_2"]
    },
    {
      "recipient": "628987654321",
      "status": "sent",
      "messageIds": ["msg_3"]
    }
  ]
}
```

### 6.8 Send Message with Device API Key (No API Token Required)
```bash
DEVICE_API_KEY="your-device-api-key"
curl -X POST "${API_BASE_URL}/device/send" \
  -H "Content-Type: application/json" \
  -H "X-Device-API-Key: ${DEVICE_API_KEY}" \
  -d '{
    "recipient": "628123456789",
    "message": "Hello from Device API Key!"
  }'
```

**With Image Upload:**
```bash
DEVICE_API_KEY="your-device-api-key"
curl -X POST "${API_BASE_URL}/device/send" \
  -H "X-Device-API-Key: ${DEVICE_API_KEY}" \
  -F "recipient=628123456789" \
  -F "message=Check this image" \
  -F "image=@/path/to/image.jpg"
```

**Response:**
```json
{
  "success": true,
  "messageId": "msg_xyz789",
  "status": "sent"
}
```

---

## 5. Server Monitoring

### 5.1 Get Server Statistics
```bash
curl -X GET "${API_BASE_URL}/server/stats" \
  -H "X-API-Token: ${API_TOKEN}" \
  -H "Accept: application/json"
```

**Response:**
```json
{
  "success": true,
  "cpu": {
    "usage": 25.5,
    "cores": 8
  },
  "memory": {
    "usagePercent": 45.2,
    "formatted": {
      "used": "7.2GB",
      "total": "16GB"
    }
  },
  "disk": {
    "usagePercent": 55,
    "used": "220GB",
    "total": "400GB"
  },
  "process": {
    "pid": 12345,
    "memory": {
      "formatted": {
        "rss": "150MB",
        "heapUsed": "80MB",
        "external": "25MB"
      }
    }
  },
  "platform": {
    "type": "Linux",
    "platform": "linux",
    "arch": "x64",
    "hostname": "server-01"
  },
  "uptime": {
    "formatted": {
      "system": "15 days",
      "process": "3 hours"
    }
  }
}
```

---

## 6. WebSocket Connection

### 6.1 Connect to WebSocket
```bash
# Using websocat (install: cargo install websocat)
websocat "ws://localhost:3001?token=${API_TOKEN}"

# Or using wscat (install: npm install -g wscat)
wscat -c "ws://localhost:3001?token=${API_TOKEN}"
```

### 6.2 Subscribe to Session (after connection)
Send this JSON message after connecting:
```json
{
  "type": "subscribe",
  "sessionId": "session_abc123"
}
```

### 6.3 WebSocket Events Received
```json
// QR Code Event
{
  "type": "qr",
  "sessionId": "session_abc123",
  "qr": "qr-code-string"
}

// Connection Status Event
{
  "type": "connection",
  "sessionId": "session_abc123",
  "status": "connected"
}

// New Message Event
{
  "type": "message",
  "sessionId": "session_abc123",
  "message": {
    "from": "628123456789@s.whatsapp.net",
    "body": "Hello!"
  }
}

// Session Update Event
{
  "type": "session_update",
  "sessionId": "session_abc123",
  "status": "connected"
}
```

---

## 7. Business Templates

### 7.1 Get All Business Templates
```bash
curl -X GET "http://localhost:3000/api/business-templates" \
  -H "X-API-Token: ${API_TOKEN}" \
  -H "Accept: application/json"
```

**With Filters:**
```bash
# Filter by business type
curl -X GET "http://localhost:3000/api/business-templates?businessType=ecommerce" \
  -H "X-API-Token: ${API_TOKEN}"

# Filter by language
curl -X GET "http://localhost:3000/api/business-templates?language=id" \
  -H "X-API-Token: ${API_TOKEN}"

# Filter by both
curl -X GET "http://localhost:3000/api/business-templates?businessType=restaurant&language=en" \
  -H "X-API-Token: ${API_TOKEN}"
```

**Response:**
```json
{
  "success": true,
  "templates": [
    {
      "id": 1,
      "businessType": "ecommerce",
      "language": "id",
      "botName": "Asisten Penjualan Digital",
      "prompt": "Anda adalah AI customer service...",
      "productKnowledge": "...",
      "salesScripts": "...",
      "businessRules": "...",
      "triggers": "@shop, @beli, @harga",
      "customerSegmentation": {...},
      "upsellStrategies": {...},
      "objectionHandling": {...},
      "faqResponses": {...},
      "isActive": true,
      "version": "1.0"
    }
  ]
}
```

### 7.2 Get Business Types List
```bash
curl -X GET "http://localhost:3000/api/business-templates/types" \
  -H "X-API-Token: ${API_TOKEN}"
```

**Response:**
```json
{
  "success": true,
  "businessTypes": [
    "automotive",
    "beauty",
    "ecommerce",
    "education",
    "finance",
    "healthcare",
    "real-estate",
    "restaurant",
    "travel"
  ]
}
```

### 7.3 Get Specific Template
```bash
# Get ecommerce template in Indonesian (default)
curl -X GET "http://localhost:3000/api/business-templates/ecommerce" \
  -H "X-API-Token: ${API_TOKEN}"

# Get restaurant template in English
curl -X GET "http://localhost:3000/api/business-templates/restaurant/en" \
  -H "X-API-Token: ${API_TOKEN}"

# Get healthcare template in Malaysian
curl -X GET "http://localhost:3000/api/business-templates/healthcare/ms" \
  -H "X-API-Token: ${API_TOKEN}"
```

**Response:**
```json
{
  "success": true,
  "template": {
    "id": 1,
    "businessType": "ecommerce",
    "language": "id",
    "botName": "Asisten Penjualan Digital",
    "prompt": "...",
    "productKnowledge": "...",
    "salesScripts": "...",
    "businessRules": "...",
    "triggers": "@shop, @beli, @harga",
    "customerSegmentation": {...},
    "upsellStrategies": {...},
    "objectionHandling": {...},
    "faqResponses": {...}
  }
}
```

### 7.4 Create or Update Template (Admin)
```bash
curl -X PUT "http://localhost:3000/api/business-templates/ecommerce/id" \
  -H "X-API-Token: ${API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "botName": "My Custom Bot",
    "prompt": "You are a helpful e-commerce assistant...",
    "productKnowledge": "Product catalog information...",
    "salesScripts": "Sales conversation scripts...",
    "businessRules": "Business rules and guidelines...",
    "triggers": "@shop, @buy, @price",
    "customerSegmentation": {
      "vip": "VIP customer description",
      "regular": "Regular customer description"
    },
    "upsellStrategies": {
      "bundle_deals": "Offer bundles with discount"
    },
    "objectionHandling": {
      "too_expensive": "Handle price objections"
    },
    "faqResponses": {
      "shipping": "Shipping information",
      "return": "Return policy"
    }
  }'
```

### 7.5 Delete Template (Admin)
```bash
curl -X DELETE "http://localhost:3000/api/business-templates/ecommerce/en" \
  -H "X-API-Token: ${API_TOKEN}"
```

**Response:**
```json
{
  "success": true,
  "message": "Template deleted successfully"
}
```

---

## 8. Device AI Settings

### 8.1 Get AI Settings
```bash
curl -X GET "${API_BASE_URL}/devices/{deviceId}/settings/ai" \
  -H "X-API-Token: ${API_TOKEN}"
```

**Response:**
```json
{
  "aiEnabled": true,
  "aiAutoReply": true,
  "aiBotName": "Assistant",
  "aiPromptTemplate": "You are a helpful assistant...",
  "aiLanguage": "id",
  "aiTriggers": ["@ai", "@bot"],
  "productKnowledge": "Product information...",
  "salesScripts": "Sales scripts...",
  "businessType": "ecommerce",
  "conversationMemoryEnabled": true,
  "maxHistoryLength": 10,
  "expiryDays": 1,
  "_systemDefaults": {
    "provider": "openai",
    "model": "gpt-3.5-turbo",
    "temperature": 0.7,
    "maxTokens": 500,
    "note": "Provider, model, and temperature are configured by system administrator"
  }
}
```

### 8.2 Update AI Settings
```bash
curl -X PUT "${API_BASE_URL}/devices/{deviceId}/settings/ai" \
  -H "X-API-Token: ${API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "aiEnabled": true,
    "aiAutoReply": true,
    "aiBotName": "My Custom Bot",
    "aiPromptTemplate": "You are a helpful e-commerce assistant for [STORE NAME]. Help customers with product inquiries, orders, and support.",
    "aiLanguage": "id",
    "aiTriggers": ["@ai", "@bot", "@assistant"],
    "productKnowledge": "PRODUCT CATALOG:\n- Product A: Rp 100.000\n- Product B: Rp 200.000",
    "salesScripts": "GREETING:\nHello! Welcome to our store...",
    "businessType": "ecommerce",
    "conversationMemoryEnabled": true,
    "maxHistoryLength": 15,
    "expiryDays": 2
  }'
```

**Response:**
```json
{
  "message": "AI settings updated successfully",
  "settings": {
    "aiEnabled": true,
    "aiAutoReply": true,
    "aiBotName": "My Custom Bot",
    "aiPromptTemplate": "...",
    "aiLanguage": "id",
    "aiTriggers": ["@ai", "@bot", "@assistant"],
    "productKnowledge": "...",
    "salesScripts": "...",
    "businessType": "ecommerce",
    "conversationMemoryEnabled": true,
    "maxHistoryLength": 15,
    "expiryDays": 2
  },
  "_systemDefaults": {
    "provider": "openai",
    "model": "gpt-3.5-turbo",
    "temperature": 0.7,
    "maxTokens": 500
  }
}
```

### 8.3 Test AI Response
```bash
curl -X POST "${API_BASE_URL}/test-ai" \
  -H "X-API-Token: ${API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": 1,
    "message": "Hello, what products do you have?"
  }'
```

**Response:**
```json
{
  "success": true,
  "response": "Hello! We have a wide range of products...",
  "settings": {
    "botName": "Assistant",
    "temperature": 0.7,
    "maxTokens": 500,
    "language": "id"
  }
}
```

### 8.4 Get Available AI Providers
```bash
curl -X GET "${API_BASE_URL}/ai/providers" \
  -H "X-API-Token: ${API_TOKEN}"
```

**Response:**
```json
{
  "success": true,
  "providers": [
    {
      "id": "openai",
      "name": "OpenAI",
      "enabled": true,
      "apiKeyConfigured": true,
      "models": [
        {
          "id": "gpt-3.5-turbo",
          "name": "GPT-3.5 Turbo",
          "pricing": {
            "input": "$0.001500/1K tokens",
            "output": "$0.002000/1K tokens"
          },
          "maxTokens": 4096,
          "contextWindow": 16385,
          "capabilities": ["chat", "completion"],
          "recommended": true,
          "isDefault": true
        }
      ],
      "defaultModel": "gpt-3.5-turbo"
    }
  ]
}
```

---

## 9. Device Webhook Settings

### 9.1 Get Webhook Settings
```bash
curl -X GET "${API_BASE_URL}/devices/{deviceId}/settings/webhook" \
  -H "X-API-Token: ${API_TOKEN}"
```

**Response:**
```json
{
  "webhookUrl": "https://your-app.com/webhooks/whatsapp",
  "webhookEvents": ["message", "status", "presence"],
  "webhookEnabled": true
}
```

### 9.2 Update Webhook Settings
```bash
curl -X PUT "${API_BASE_URL}/devices/{deviceId}/settings/webhook" \
  -H "X-API-Token: ${API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "webhookUrl": "https://your-app.com/webhooks/whatsapp",
    "webhookEvents": ["message", "status", "presence", "connection"],
    "webhookEnabled": true
  }'
```

**Response:**
```json
{
  "message": "Webhook settings updated successfully",
  "settings": {
    "webhookUrl": "https://your-app.com/webhooks/whatsapp",
    "webhookEvents": ["message", "status", "presence", "connection"],
    "webhookEnabled": true
  }
}
```

---

## 10. Chat Settings (Auto-Reply & Per-Chat AI)

### 10.1 Get All Chats for Device
```bash
curl -X GET "${API_BASE_URL}/devices/{deviceId}/chat-settings" \
  -H "X-API-Token: ${API_TOKEN}" \
  -H "Accept: application/json"
```

**With Pagination:**
```bash
curl -X GET "${API_BASE_URL}/devices/{deviceId}/chat-settings?limit=50&offset=0" \
  -H "X-API-Token: ${API_TOKEN}"
```

**Response:**
```json
{
  "success": true,
  "chats": [
    {
      "id": 1,
      "deviceId": 1,
      "chatId": "628123456789@s.whatsapp.net",
      "phoneNumber": "628123456789",
      "contactName": "John Doe",
      "aiEnabled": true,
      "customerSegment": "vip",
      "notes": "Premium customer",
      "lastMessageContent": "Hello",
      "lastMessageTimestamp": "2024-01-15T10:30:00Z",
      "totalIncomingMessages": 50,
      "totalOutgoingMessages": 45
    }
  ],
  "total": 100,
  "device": {
    "id": 1,
    "alias": "My Device",
    "sessionId": "session_abc123"
  }
}
```

### 10.2 Get Chat Summary
```bash
curl -X GET "${API_BASE_URL}/devices/{deviceId}/chat-settings/summary" \
  -H "X-API-Token: ${API_TOKEN}"
```

**Response:**
```json
{
  "success": true,
  "summary": [...],
  "stats": {
    "totalActiveChats": 25,
    "aiEnabledChats": 15,
    "totalIncoming": 500,
    "totalOutgoing": 450
  }
}
```

### 10.3 Get Specific Chat Settings
```bash
curl -X GET "${API_BASE_URL}/devices/{deviceId}/chat-settings/{phoneNumber}" \
  -H "X-API-Token: ${API_TOKEN}"
```

**Example:**
```bash
curl -X GET "${API_BASE_URL}/devices/1/chat-settings/628123456789" \
  -H "X-API-Token: ${API_TOKEN}"
```

**Response:**
```json
{
  "success": true,
  "chat": {
    "id": 1,
    "deviceId": 1,
    "chatId": "628123456789@s.whatsapp.net",
    "phoneNumber": "628123456789",
    "contactName": "John Doe",
    "aiEnabled": true,
    "customerSegment": "vip",
    "notes": "Premium customer - prioritize",
    "lastMessageContent": "Hello",
    "lastMessageTimestamp": "2024-01-15T10:30:00Z"
  }
}
```

### 10.4 Update Chat Settings (Enable/Disable AI, Auto-Reply)
```bash
curl -X PUT "${API_BASE_URL}/devices/{deviceId}/chat-settings/{phoneNumber}" \
  -H "X-API-Token: ${API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "aiEnabled": true,
    "contactName": "John Doe",
    "customerSegment": "vip",
    "notes": "Premium customer - prioritize responses"
  }'
```

**Example:**
```bash
curl -X PUT "${API_BASE_URL}/devices/1/chat-settings/628123456789" \
  -H "X-API-Token: ${API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "aiEnabled": false,
    "contactName": "John Doe Updated",
    "customerSegment": "regular",
    "notes": "Updated notes"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Chat settings updated successfully",
  "chat": {
    "id": 1,
    "deviceId": 1,
    "chatId": "628123456789@s.whatsapp.net",
    "phoneNumber": "628123456789",
    "contactName": "John Doe Updated",
    "aiEnabled": false,
    "customerSegment": "regular",
    "notes": "Updated notes"
  }
}
```

### 10.5 Bulk Update Chat Settings
```bash
curl -X POST "${API_BASE_URL}/devices/{deviceId}/chat-settings/bulk-update" \
  -H "X-API-Token: ${API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumbers": ["628123456789", "628987654321", "628111222333"],
    "settings": {
      "aiEnabled": true,
      "customerSegment": "vip"
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Updated 3 chats",
  "updatedCount": 3
}
```

### 10.6 Get Chat Conversation History
```bash
curl -X GET "${API_BASE_URL}/devices/{deviceId}/chat-settings/{phoneNumber}/conversation" \
  -H "X-API-Token: ${API_TOKEN}"
```

**With Pagination:**
```bash
curl -X GET "${API_BASE_URL}/devices/1/chat-settings/628123456789/conversation?limit=50&offset=0" \
  -H "X-API-Token: ${API_TOKEN}"
```

**Response:**
```json
{
  "success": true,
  "chat": {
    "phoneNumber": "628123456789",
    "chatId": "628123456789@s.whatsapp.net",
    "contactName": "John Doe",
    "deviceId": 1,
    "sessionId": "session_abc123"
  },
  "conversation": [
    {
      "id": 1,
      "content": "Hello",
      "role": "user",
      "timestamp": "2024-01-15T10:30:00Z",
      "source": "ai_memory",
      "direction": "incoming"
    },
    {
      "id": 2,
      "content": "Hi! How can I help you?",
      "role": "assistant",
      "timestamp": "2024-01-15T10:30:05Z",
      "source": "ai_memory",
      "direction": "outgoing"
    }
  ],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 2,
    "hasMore": false
  },
  "source": "ai_memory"
}
```

### 10.7 Get Chat Statistics
```bash
curl -X GET "${API_BASE_URL}/devices/{deviceId}/chat-settings/{phoneNumber}/stats" \
  -H "X-API-Token: ${API_TOKEN}"
```

**Response:**
```json
{
  "success": true,
  "chat": {
    "phoneNumber": "628123456789",
    "chatId": "628123456789@s.whatsapp.net",
    "contactName": "John Doe",
    "aiEnabled": true,
    "lastMessageContent": "Hello",
    "lastMessageTimestamp": "2024-01-15T10:30:00Z"
  },
  "stats": {
    "totalMessages": 50,
    "aiMessages": 25,
    "userMessages": 25,
    "firstMessageDate": "2024-01-10T08:00:00Z",
    "lastMessageDate": "2024-01-15T10:30:00Z",
    "averageResponseTime": null
  }
}
```

### 10.8 Update Conversation Memory Settings
```bash
curl -X PATCH "${API_BASE_URL}/devices/{deviceId}/{chatId}/memory" \
  -H "X-API-Token: ${API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "memoryRetentionHours": 72,
    "maxHistoryMessages": 30
  }'
```

**Example:**
```bash
curl -X PATCH "${API_BASE_URL}/devices/1/628123456789@s.whatsapp.net/memory" \
  -H "X-API-Token: ${API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "memoryRetentionHours": 72,
    "maxHistoryMessages": 30
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Memory settings updated successfully",
  "data": {
    "chatId": "628123456789@s.whatsapp.net",
    "phoneNumber": "628123456789",
    "memoryRetentionHours": 72,
    "maxHistoryMessages": 30
  }
}
```

### 10.9 Clear Conversation Memory
```bash
curl -X DELETE "${API_BASE_URL}/devices/{deviceId}/{chatId}/memory" \
  -H "X-API-Token: ${API_TOKEN}"
```

**Example:**
```bash
curl -X DELETE "${API_BASE_URL}/devices/1/628123456789@s.whatsapp.net/memory" \
  -H "X-API-Token: ${API_TOKEN}"
```

**Response:**
```json
{
  "success": true,
  "message": "Cleared 50 conversation memory entries",
  "data": {
    "chatId": "628123456789@s.whatsapp.net",
    "deletedEntries": 50
  }
}
```

---

## 11. Warmer System

**Note:** Warmer system must be enabled with `WARMER_ENABLED=true` in `.env` file.

### 11.1 Create Campaign
```bash
curl -X POST "http://localhost:3000/api/warmer/campaigns" \
  -H "X-API-Token: ${API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "January Campaign",
    "deviceId": 1,
    "sessionId": "session_abc123",
    "targetNumbers": [
      "628123456789",
      "628987654321"
    ],
    "messagesPerDay": 10,
    "delayBetweenMessages": 300,
    "schedule": {
      "startTime": "09:00",
      "endTime": "18:00",
      "daysOfWeek": [1, 2, 3, 4, 5]
    },
    "autoStart": true
  }'
```

**Response:**
```json
{
  "success": true,
  "campaign": {
    "id": 1,
    "name": "January Campaign",
    "deviceId": 1,
    "status": "active",
    "messagesPerDay": 10,
    "totalMessagesSent": 0,
    "createdAt": "2025-12-01T10:00:00Z"
  }
}
```

### 11.2 Get All Campaigns
```bash
curl -X GET "http://localhost:3000/api/warmer/campaigns" \
  -H "X-API-Token: ${API_TOKEN}"
```

**Response:**
```json
{
  "success": true,
  "campaigns": [
    {
      "id": 1,
      "name": "January Campaign",
      "deviceId": 1,
      "status": "active",
      "messagesPerDay": 10,
      "totalMessagesSent": 50,
      "lastMessageAt": "2025-12-01T15:30:00Z"
    }
  ]
}
```

### 11.3 Get Campaign Details
```bash
CAMPAIGN_ID=1
curl -X GET "http://localhost:3000/api/warmer/campaigns/${CAMPAIGN_ID}" \
  -H "X-API-Token: ${API_TOKEN}"
```

**Response:**
```json
{
  "success": true,
  "campaign": {
    "id": 1,
    "name": "January Campaign",
    "deviceId": 1,
    "sessionId": "session_abc123",
    "status": "active",
    "targetNumbers": ["628123456789"],
    "messagesPerDay": 10,
    "delayBetweenMessages": 300,
    "totalMessagesSent": 50,
    "schedule": {
      "startTime": "09:00",
      "endTime": "18:00",
      "daysOfWeek": [1, 2, 3, 4, 5]
    }
  }
}
```

### 11.4 Update Campaign
```bash
CAMPAIGN_ID=1
curl -X PUT "http://localhost:3000/api/warmer/campaigns/${CAMPAIGN_ID}" \
  -H "X-API-Token: ${API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Campaign",
    "messagesPerDay": 15,
    "targetNumbers": ["628123456789", "628111222333"]
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Campaign updated successfully",
  "campaign": {
    "id": 1,
    "name": "Updated Campaign",
    "messagesPerDay": 15
  }
}
```

### 11.5 Pause Campaign
```bash
CAMPAIGN_ID=1
curl -X POST "http://localhost:3000/api/warmer/campaigns/${CAMPAIGN_ID}/pause" \
  -H "X-API-Token: ${API_TOKEN}"
```

**Response:**
```json
{
  "success": true,
  "message": "Campaign paused successfully"
}
```

### 11.6 Resume Campaign
```bash
CAMPAIGN_ID=1
curl -X POST "http://localhost:3000/api/warmer/campaigns/${CAMPAIGN_ID}/resume" \
  -H "X-API-Token: ${API_TOKEN}"
```

**Response:**
```json
{
  "success": true,
  "message": "Campaign resumed successfully"
}
```

### 11.7 Stop Campaign
```bash
CAMPAIGN_ID=1
curl -X POST "http://localhost:3000/api/warmer/campaigns/${CAMPAIGN_ID}/stop" \
  -H "X-API-Token: ${API_TOKEN}"
```

**Response:**
```json
{
  "success": true,
  "message": "Campaign stopped successfully"
}
```

### 11.8 Delete Campaign
```bash
CAMPAIGN_ID=1
curl -X DELETE "http://localhost:3000/api/warmer/campaigns/${CAMPAIGN_ID}" \
  -H "X-API-Token: ${API_TOKEN}"
```

**Response:**
```json
{
  "success": true,
  "message": "Campaign deleted successfully"
}
```

### 11.9 Create Conversation Template
```bash
CAMPAIGN_ID=1
curl -X POST "http://localhost:3000/api/warmer/campaigns/${CAMPAIGN_ID}/templates" \
  -H "X-API-Token: ${API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Greeting Template",
    "conversation": [
      {
        "message": "Hi! How are you?",
        "delay": 0
      },
      {
        "message": "Just checking in",
        "delay": 60
      }
    ],
    "isActive": true
  }'
```

**Response:**
```json
{
  "success": true,
  "template": {
    "id": 1,
    "campaignId": 1,
    "name": "Greeting Template",
    "conversation": [
      {"message": "Hi! How are you?", "delay": 0},
      {"message": "Just checking in", "delay": 60}
    ],
    "isActive": true
  }
}
```

### 11.10 Get Campaign Templates
```bash
CAMPAIGN_ID=1
curl -X GET "http://localhost:3000/api/warmer/campaigns/${CAMPAIGN_ID}/templates" \
  -H "X-API-Token: ${API_TOKEN}"
```

**Response:**
```json
{
  "success": true,
  "templates": [
    {
      "id": 1,
      "name": "Greeting Template",
      "conversation": [
        {"message": "Hi! How are you?", "delay": 0}
      ],
      "isActive": true,
      "usageCount": 10
    }
  ]
}
```

### 11.11 Get Campaign Statistics
```bash
CAMPAIGN_ID=1
curl -X GET "http://localhost:3000/api/warmer/campaigns/${CAMPAIGN_ID}/stats" \
  -H "X-API-Token: ${API_TOKEN}"
```

**Response:**
```json
{
  "success": true,
  "stats": {
    "totalMessagesSent": 150,
    "totalConversations": 50,
    "successRate": 95.5,
    "averageResponseTime": 120,
    "messagesByDay": {
      "2025-12-01": 10,
      "2025-12-02": 15
    }
  }
}
```

### 11.12 Get Conversation Logs
```bash
CAMPAIGN_ID=1
curl -X GET "http://localhost:3000/api/warmer/campaigns/${CAMPAIGN_ID}/logs?limit=50&offset=0" \
  -H "X-API-Token: ${API_TOKEN}"
```

**Response:**
```json
{
  "success": true,
  "logs": [
    {
      "id": 1,
      "campaignId": 1,
      "targetNumber": "628123456789",
      "templateId": 1,
      "messages": [
        {
          "message": "Hi! How are you?",
          "sentAt": "2025-12-01T10:00:00Z",
          "status": "delivered"
        }
      ],
      "completedAt": "2025-12-01T10:05:00Z"
    }
  ],
  "total": 100,
  "limit": 50,
  "offset": 0
}
```

### 11.13 Get Available Devices for Warmer
```bash
curl -X GET "http://localhost:3000/api/warmer/devices" \
  -H "X-API-Token: ${API_TOKEN}"
```

**Response:**
```json
{
  "success": true,
  "devices": [
    {
      "id": 1,
      "alias": "My Device",
      "sessionId": "session_abc123",
      "status": "connected",
      "phoneNumber": "628123456789"
    }
  ]
}
```

### 11.14 Get Default Templates
```bash
curl -X GET "http://localhost:3000/api/warmer/templates/defaults" \
  -H "X-API-Token: ${API_TOKEN}"
```

**Response:**
```json
{
  "success": true,
  "templates": [
    {
      "name": "Casual Greeting",
      "conversation": [
        {"message": "Hey! How's it going?", "delay": 0},
        {"message": "Long time no talk!", "delay": 30}
      ]
    }
  ]
}
```

---

## 12. Admin Routes (Admin Only)

**Note:** Admin routes require admin authentication. Only admin users can access these endpoints.

### 12.1 AI Providers Management
```bash
# Get all AI providers
curl -X GET "${API_BASE_URL}/admin/ai/providers" \
  -H "X-API-Token: ${API_TOKEN}"

# Create new AI provider
curl -X POST "${API_BASE_URL}/admin/ai/providers" \
  -H "X-API-Token: ${API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "openai",
    "name": "OpenAI",
    "apiKey": "your-api-key",
    "baseUrl": "https://api.openai.com/v1"
  }'

# Update AI provider
curl -X PUT "${API_BASE_URL}/admin/ai/providers/openai" \
  -H "X-API-Token: ${API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "OpenAI Updated",
    "apiKey": "new-api-key"
  }'

# Delete AI provider
curl -X DELETE "${API_BASE_URL}/admin/ai/providers/openai" \
  -H "X-API-Token: ${API_TOKEN}"
```

### 12.2 AI Models Management
```bash
# Get all AI models
curl -X GET "${API_BASE_URL}/admin/ai/models" \
  -H "X-API-Token: ${API_TOKEN}"

# Create new AI model
curl -X POST "${API_BASE_URL}/admin/ai/models" \
  -H "X-API-Token: ${API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "providerId": "openai",
    "modelId": "gpt-4",
    "name": "GPT-4",
    "maxTokens": 8192,
    "contextWindow": 32768
  }'

# Update AI model
curl -X PUT "${API_BASE_URL}/admin/ai/models/1" \
  -H "X-API-Token: ${API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "GPT-4 Turbo",
    "maxTokens": 4096
  }'

# Delete AI model
curl -X DELETE "${API_BASE_URL}/admin/ai/models/1" \
  -H "X-API-Token: ${API_TOKEN}"
```

### 12.3 AI Usage Logs
```bash
# Get AI usage logs (admin view-only)
curl -X GET "${API_BASE_URL}/admin/ai/usage-logs?limit=50&offset=0" \
  -H "X-API-Token: ${API_TOKEN}"
```

**Response:**
```json
{
  "success": true,
  "logs": [
    {
      "id": 1,
      "userId": "user-123",
      "deviceId": 1,
      "model": "gpt-3.5-turbo",
      "promptTokens": 100,
      "completionTokens": 50,
      "totalTokens": 150,
      "cost": 0.003,
      "createdAt": "2025-12-01T10:00:00Z"
    }
  ],
  "total": 1000
}
```

### 12.4 AI Cost Alerts
```bash
# Get AI cost alerts (admin view-only)
curl -X GET "${API_BASE_URL}/admin/ai/cost-alerts" \
  -H "X-API-Token: ${API_TOKEN}"
```

**Response:**
```json
{
  "success": true,
  "alerts": [
    {
      "userId": "user-123",
      "totalCost": 15.50,
      "monthlyLimit": 10.00,
      "alertLevel": "exceeded",
      "lastAlertSent": "2025-12-01T10:00:00Z"
    }
  ]
}
```

---

## Quick Reference - All Endpoints

### Device Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/devices` | Create new device |
| GET | `/sessions` | Get all sessions |
| GET | `/users/{userId}/devices` | Get user's devices |
| GET | `/devices/{id}` | Get device details |
| PUT | `/devices/{id}` | Update device metadata |
| POST | `/devices/{id}/login` | Login device (get QR) |
| POST | `/devices/{id}/logout` | Logout device |
| DELETE | `/devices/{id}` | Delete device |
| GET | `/devices/{id}/qr` | Get QR code |
| POST | `/sessions/{sessionId}/cancel` | Cancel session |

### Messaging
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/send` | Send text message |
| POST | `/send/image` | Send image |
| POST | `/send/video` | Send video |
| POST | `/send/document` | Send document |
| POST | `/send/bulk` | Send bulk files |
| POST | `/send/batch` | Send batch files |
| GET | `/messages` | Get messages |
| GET | `/messages/{messageId}/status` | Get message status |
| POST | `/messages/{messageId}/resend` | Resend message |

### Contacts & Chats
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/devices/{deviceId}/contacts` | Get contacts |
| GET | `/devices/{deviceId}/chats` | Get chats |
| GET | `/devices/{deviceId}/groups` | Get groups |
| GET | `/users/{userId}/contacts` | Get user contacts |

### Business Templates
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/business-templates` | Get all templates |
| GET | `/api/business-templates/types` | Get business types |
| GET | `/api/business-templates/{businessType}/{language?}` | Get specific template |
| PUT | `/api/business-templates/{businessType}/{language?}` | Create/update template |
| DELETE | `/api/business-templates/{businessType}/{language?}` | Delete template |

### Device AI Settings
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/devices/{id}/settings/ai` | Get AI settings |
| PUT | `/devices/{id}/settings/ai` | Update AI settings |
| POST | `/test-ai` | Test AI response |
| GET | `/ai/providers` | Get available AI providers |

### Device Webhook Settings
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/devices/{id}/settings/webhook` | Get webhook settings |
| PUT | `/devices/{id}/settings/webhook` | Update webhook settings |

### Chat Settings (Auto-Reply & Per-Chat AI)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/devices/{deviceId}/chat-settings` | Get all chats |
| GET | `/devices/{deviceId}/chat-settings/summary` | Get chat summary |
| GET | `/devices/{deviceId}/chat-settings/{phoneNumber}` | Get chat settings |
| PUT | `/devices/{deviceId}/chat-settings/{phoneNumber}` | Update chat settings |
| POST | `/devices/{deviceId}/chat-settings/bulk-update` | Bulk update chats |
| GET | `/devices/{deviceId}/chat-settings/{phoneNumber}/conversation` | Get conversation history |
| GET | `/devices/{deviceId}/chat-settings/{phoneNumber}/stats` | Get chat statistics |
| PATCH | `/devices/{deviceId}/{chatId}/memory` | Update memory settings |
| DELETE | `/devices/{deviceId}/{chatId}/memory` | Clear conversation memory |

### Admin Routes (Admin Only)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/ai/providers` | Get all AI providers |
| POST | `/admin/ai/providers` | Create AI provider |
| PUT | `/admin/ai/providers/{providerId}` | Update AI provider |
| DELETE | `/admin/ai/providers/{providerId}` | Delete AI provider |
| GET | `/admin/ai/models` | Get all AI models |
| POST | `/admin/ai/models` | Create AI model |
| PUT | `/admin/ai/models/{modelId}` | Update AI model |
| DELETE | `/admin/ai/models/{modelId}` | Delete AI model |
| GET | `/admin/ai/usage-logs` | Get AI usage logs |
| GET | `/admin/ai/cost-alerts` | Get AI cost alerts |

### Device API Key Routes
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/device/send` | Send message using device API key |

### Warmer System
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/warmer/campaigns` | Create campaign |
| GET | `/warmer/campaigns` | Get all campaigns |
| GET | `/warmer/campaigns/{campaignId}` | Get campaign details |
| PUT | `/warmer/campaigns/{campaignId}` | Update campaign |
| DELETE | `/warmer/campaigns/{campaignId}` | Delete campaign |
| POST | `/warmer/campaigns/{campaignId}/pause` | Pause campaign |
| POST | `/warmer/campaigns/{campaignId}/resume` | Resume campaign |
| POST | `/warmer/campaigns/{campaignId}/stop` | Stop campaign |
| POST | `/warmer/campaigns/{campaignId}/templates` | Create conversation template |
| GET | `/warmer/campaigns/{campaignId}/templates` | Get campaign templates |
| PUT | `/warmer/campaigns/{campaignId}/templates/{templateId}` | Update template |
| DELETE | `/warmer/campaigns/{campaignId}/templates/{templateId}` | Delete template |
| GET | `/warmer/campaigns/{campaignId}/stats` | Get campaign statistics |
| GET | `/warmer/campaigns/{campaignId}/logs` | Get conversation logs |
| GET | `/warmer/devices` | Get available devices |
| GET | `/warmer/templates/defaults` | Get default templates |

### Files
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/files/upload` | Upload file |
| GET | `/files` | List files |
| GET | `/files/search` | Search files |
| GET | `/files/users/{userId}/stats` | Get user file stats |
| GET | `/files/users/{userId}/{fileType}` | Get user files by type |
| DELETE | `/files/bulk` | Bulk delete files |
| GET | `/files/{id}` | Get file details |
| PUT | `/files/{id}` | Update file metadata |
| DELETE | `/files/{id}` | Delete file |
| POST | `/files/cleanup/expired` | Cleanup expired files |
| GET | `/files/{id}/preview` | Get file preview (public) |

### Server
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/server/stats` | Get server stats |

---

## Authentication Headers

All requests require:
```
X-API-Token: your-api-token
```

For device-specific operations (alternative to sessionId):
```
X-Device-API-Key: your-device-api-key
```

---

## Phone Number Format

- Use country code without `+` sign
- Example: `628123456789` (Indonesia)
- Example: `14155551234` (USA)

---

Generated from `public/index.html` - WhatsApp API Testing Dashboard

