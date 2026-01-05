#!/usr/bin/env node
/**
 * Diagnostic script to test API key
 */

const crypto = require('crypto');
const apiKey = 'c3c5e44b852063dd6434e972ff46a9243adca5ea2545218647eef67b28afcf8e';

console.log('API Key Analysis:');
console.log('================');
console.log('Key:', apiKey);
console.log('Length:', apiKey.length);
console.log('Is 64 chars?', apiKey.length === 64);
console.log('Matches device API key regex?', /^[a-f0-9]{64}$/.test(apiKey));
console.log('');

// Hash the key (same way the middleware does)
function hashApiKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

const keyHash = hashApiKey(apiKey);
console.log('Key Hash (SHA-256):', keyHash);
console.log('');

console.log('To check if this key exists in the database, run:');
console.log('');
console.log('mysql -u root -p whatsapp_gateway -e "');
console.log('  SELECT id, workspace_id, display_name, status, device_api_key_prefix');
console.log('  FROM whatsapp_accounts');
console.log('  WHERE device_api_key_hash = \'' + keyHash + '\';');
console.log('"');
console.log('');
console.log('Or check all device API keys:');
console.log('mysql -u root -p whatsapp_gateway -e "');
console.log('  SELECT id, workspace_id, display_name, status, device_api_key_prefix');
console.log('  FROM whatsapp_accounts');
console.log('  WHERE device_api_key_hash IS NOT NULL;');
console.log('"');

