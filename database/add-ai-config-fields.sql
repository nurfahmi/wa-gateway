-- Add missing AI configuration fields
ALTER TABLE ai_configurations 
ADD COLUMN IF NOT EXISTS require_trigger BOOLEAN DEFAULT FALSE AFTER conversation_memory_enabled,
ADD COLUMN IF NOT EXISTS trigger_word VARCHAR(255) NULL AFTER require_trigger,
ADD COLUMN IF NOT EXISTS ai_rule TEXT NULL AFTER trigger_word;

