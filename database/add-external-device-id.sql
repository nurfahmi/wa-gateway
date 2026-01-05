-- Add external_device_id column to store Baileys service's device ID
-- This is needed to call endpoints like /devices/{id}/qr and /devices/{id}/settings/webhook

ALTER TABLE whatsapp_accounts
ADD COLUMN external_device_id VARCHAR(100) NULL AFTER account_identifier,
ADD INDEX idx_external_device_id (external_device_id);

-- Update existing records to set external_device_id = account_identifier for now
-- (This won't work for existing devices, but new ones will get the correct ID)

