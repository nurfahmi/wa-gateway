/**
 * Normalized event types
 */
const EventTypes = {
  MESSAGE_RECEIVED: 'message.received',
  MESSAGE_STATUS: 'message.status',
  CONNECTION_UPDATE: 'connection.update',
  QR_CODE: 'qr.code'
};

/**
 * Normalized message structure
 * All providers must transform their messages to this format
 */
class NormalizedMessage {
  constructor(data) {
    this.accountId = data.accountId;           // Internal account ID
    this.accountIdentifier = data.accountIdentifier; // Provider account identifier
    this.messageId = data.messageId;           // Provider-specific message ID
    this.from = data.from;                     // E.164 format
    this.to = data.to;                         // E.164 format
    this.timestamp = data.timestamp;           // Unix timestamp in ms
    this.type = data.type;                     // 'text' | 'image' | 'document' | 'video' | 'audio'
    this.content = data.content;               // Message content object
    this.direction = data.direction;           // 'incoming' | 'outgoing'
    this.status = data.status;                 // 'sent' | 'delivered' | 'read' | 'failed' | 'received'
    this.isGroup = data.isGroup || false;      // Whether from group chat
  }
}

/**
 * Normalized connection event
 */
class NormalizedConnectionEvent {
  constructor(data) {
    this.accountId = data.accountId;
    this.accountIdentifier = data.accountIdentifier;
    this.status = data.status;                 // 'connecting' | 'connected' | 'disconnected' | 'failed'
    this.phoneNumber = data.phoneNumber;       // E.164 format (when connected)
    this.timestamp = data.timestamp || Date.now();
  }
}

/**
 * Normalized QR code event
 */
class NormalizedQREvent {
  constructor(data) {
    this.accountId = data.accountId;
    this.accountIdentifier = data.accountIdentifier;
    this.qrCode = data.qrCode;                 // QR code string
    this.expiresAt = data.expiresAt;           // Expiration timestamp
    this.timestamp = data.timestamp || Date.now();
  }
}

/**
 * Normalized message status event
 */
class NormalizedStatusEvent {
  constructor(data) {
    this.accountId = data.accountId;
    this.accountIdentifier = data.accountIdentifier;
    this.messageId = data.messageId;
    this.status = data.status;                 // 'sent' | 'delivered' | 'read' | 'failed'
    this.timestamp = data.timestamp || Date.now();
  }
}

module.exports = {
  EventTypes,
  NormalizedMessage,
  NormalizedConnectionEvent,
  NormalizedQREvent,
  NormalizedStatusEvent
};

