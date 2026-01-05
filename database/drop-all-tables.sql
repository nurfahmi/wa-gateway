-- Drop all tables safely with foreign key checks disabled
-- This will remove ALL data from the database

SET FOREIGN_KEY_CHECKS = 0;

-- Drop automation tables first
DROP TABLE IF EXISTS conversation_logs;
DROP TABLE IF EXISTS scheduled_messages;
DROP TABLE IF EXISTS broadcast_messages;
DROP TABLE IF EXISTS contact_groups;
DROP TABLE IF EXISTS contacts;
DROP TABLE IF EXISTS message_templates;
DROP TABLE IF EXISTS auto_reply_rules;
DROP TABLE IF EXISTS ai_configurations;

-- Drop main schema tables
DROP TABLE IF EXISTS rate_limits;
DROP TABLE IF EXISTS webhook_configs;
DROP TABLE IF EXISTS message_logs;
DROP TABLE IF EXISTS api_keys;
DROP TABLE IF EXISTS whatsapp_accounts;
DROP TABLE IF EXISTS workspace_users;
DROP TABLE IF EXISTS workspaces;

SET FOREIGN_KEY_CHECKS = 1;

SELECT 'All tables dropped successfully' AS Status;

