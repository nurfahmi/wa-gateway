-- Add device-level API keys to WhatsApp accounts
-- This allows each device to have its own API key for REST API access

ALTER TABLE whatsapp_accounts
ADD COLUMN device_api_key_hash VARCHAR(255) NULL AFTER provider_config,
ADD COLUMN device_api_key_prefix VARCHAR(20) NULL AFTER device_api_key_hash,
ADD COLUMN device_api_key_last_used_at TIMESTAMP NULL AFTER device_api_key_prefix;

-- Add indexes for device API key lookups
CREATE INDEX idx_device_api_key_hash ON whatsapp_accounts(device_api_key_hash);
CREATE INDEX idx_device_api_key_prefix ON whatsapp_accounts(device_api_key_prefix);

-- Note: The device API key will be generated when an account is created
-- Format: dev_<workspace_id>_<random_string>

