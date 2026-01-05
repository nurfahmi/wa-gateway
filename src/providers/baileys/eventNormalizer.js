const { NormalizedMessage, NormalizedConnectionEvent, NormalizedQREvent, NormalizedStatusEvent } = require('../events');
const phoneNumber = require('../../utils/phoneNumber');

class BaileysEventNormalizer {
  /**
   * Normalize Baileys message to standard format
   */
  static normalizeMessage(baileysMessage, accountId, accountIdentifier) {
    const msg = baileysMessage.message;
    if (!msg) return null;

    // Extract basic info
    const remoteJid = baileysMessage.key.remoteJid;
    const isGroup = phoneNumber.isGroupJID(remoteJid);
    const isFromMe = baileysMessage.key.fromMe;
    const phone = remoteJid.split('@')[0];

    let normalized = {
      accountId,
      accountIdentifier,
      messageId: baileysMessage.key.id,
      from: isFromMe ? null : phoneNumber.formatToE164(phone),
      to: isFromMe ? phoneNumber.formatToE164(phone) : null,
      timestamp: baileysMessage.messageTimestamp * 1000,
      direction: isFromMe ? 'outgoing' : 'incoming',
      status: 'received',
      isGroup
    };

    // Parse message type and content
    if (msg.conversation) {
      normalized.type = 'text';
      normalized.content = { text: msg.conversation };
    }
    else if (msg.extendedTextMessage) {
      normalized.type = 'text';
      normalized.content = { text: msg.extendedTextMessage.text };
    }
    else if (msg.imageMessage) {
      normalized.type = 'image';
      normalized.content = {
        caption: msg.imageMessage.caption || null,
        mimeType: msg.imageMessage.mimetype,
        mediaUrl: null // Will be populated if media is downloaded
      };
    }
    else if (msg.documentMessage) {
      normalized.type = 'document';
      normalized.content = {
        fileName: msg.documentMessage.fileName,
        mimeType: msg.documentMessage.mimetype,
        mediaUrl: null
      };
    }
    else if (msg.videoMessage) {
      normalized.type = 'video';
      normalized.content = {
        caption: msg.videoMessage.caption || null,
        mimeType: msg.videoMessage.mimetype,
        mediaUrl: null
      };
    }
    else if (msg.audioMessage) {
      normalized.type = 'audio';
      normalized.content = {
        mimeType: msg.audioMessage.mimetype,
        duration: msg.audioMessage.seconds,
        mediaUrl: null
      };
    }
    else {
      // Unsupported message type
      return null;
    }

    return new NormalizedMessage(normalized);
  }

  /**
   * Normalize connection update event
   */
  static normalizeConnectionUpdate(update, accountId, accountIdentifier) {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      return new NormalizedQREvent({
        accountId,
        accountIdentifier,
        qrCode: qr,
        expiresAt: new Date(Date.now() + 60000) // QR expires in 60 seconds
      });
    }

    if (connection) {
      let status = connection;
      
      // Map Baileys connection states to our standard states
      if (connection === 'close') {
        status = 'disconnected';
      } else if (connection === 'open') {
        status = 'connected';
      } else if (connection === 'connecting') {
        status = 'connecting';
      }

      return new NormalizedConnectionEvent({
        accountId,
        accountIdentifier,
        status,
        phoneNumber: null // Will be set separately when available
      });
    }

    return null;
  }

  /**
   * Normalize message status update
   */
  static normalizeStatusUpdate(update, accountId, accountIdentifier) {
    const status = update.status;
    
    // Map Baileys status codes
    let normalizedStatus = status;
    if (status === 1) normalizedStatus = 'sent';
    else if (status === 2) normalizedStatus = 'delivered';
    else if (status === 3) normalizedStatus = 'read';
    else if (status === 0) normalizedStatus = 'failed';

    return new NormalizedStatusEvent({
      accountId,
      accountIdentifier,
      messageId: update.key.id,
      status: normalizedStatus
    });
  }
}

module.exports = BaileysEventNormalizer;

