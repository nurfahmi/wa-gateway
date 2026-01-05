-- Migration: Remove device API key columns from whatsapp_accounts table
-- Device API keys are now managed by Baileys service, not stored in our database

-- Remove device API key related columns
ALTER TABLE `whatsapp_accounts`
  DROP COLUMN IF EXISTS `device_api_key_hash`,
  DROP COLUMN IF EXISTS `device_api_key_prefix`,
  DROP COLUMN IF EXISTS `device_api_key_encrypted`,
  DROP COLUMN IF EXISTS `device_api_key_last_used_at`;

-- Note: Device API keys are validated directly with Baileys service
-- when used in API requests (see src/middlewares/apiKey.js)



