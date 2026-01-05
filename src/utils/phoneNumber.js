/**
 * Format phone number to E.164 format
 * @param {string} phoneNumber - Phone number in any format
 * @returns {string} - E.164 formatted number (+1234567890)
 */
function formatToE164(phoneNumber) {
  // Remove all non-numeric characters
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // If it doesn't start with country code, assume it needs one
  if (!phoneNumber.startsWith('+')) {
    return `+${cleaned}`;
  }
  
  return `+${cleaned}`;
}

/**
 * Validate E.164 phone number format
 * @param {string} phoneNumber 
 * @returns {boolean}
 */
function isValidE164(phoneNumber) {
  // E.164 format: +[country code][subscriber number]
  // Length: 7-15 digits (excluding +)
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  return e164Regex.test(phoneNumber);
}

/**
 * Format phone number to WhatsApp JID format
 * @param {string} phoneNumber - E.164 formatted number
 * @returns {string} - WhatsApp JID (1234567890@s.whatsapp.net)
 */
function formatToJID(phoneNumber) {
  // Remove + sign and format to JID
  const cleaned = phoneNumber.replace(/\D/g, '');
  return `${cleaned}@s.whatsapp.net`;
}

/**
 * Extract phone number from WhatsApp JID
 * @param {string} jid - WhatsApp JID
 * @returns {string} - E.164 formatted number
 */
function extractFromJID(jid) {
  const phoneNumber = jid.split('@')[0];
  return `+${phoneNumber}`;
}

/**
 * Check if JID is a group
 * @param {string} jid 
 * @returns {boolean}
 */
function isGroupJID(jid) {
  return jid.endsWith('@g.us');
}

/**
 * Format phone number for display
 * @param {string} phoneNumber - E.164 formatted number
 * @returns {string} - Formatted for display
 */
function formatForDisplay(phoneNumber) {
  // Simple display format: +1 (234) 567-8900
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    // US number
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  
  // Default: just add + if not present
  return phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
}

module.exports = {
  formatToE164,
  isValidE164,
  formatToJID,
  extractFromJID,
  isGroupJID,
  formatForDisplay
};

