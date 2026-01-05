-- Complete Database Setup
-- This file will drop all tables and recreate them from scratch

-- ==========================================
-- STEP 1: Drop all existing tables
-- ==========================================

SET FOREIGN_KEY_CHECKS = 0;

-- Drop automation tables
DROP TABLE IF EXISTS conversation_logs;
DROP TABLE IF EXISTS scheduled_messages;
DROP TABLE IF EXISTS broadcast_messages;
DROP TABLE IF EXISTS contact_groups;
DROP TABLE IF EXISTS contacts;
DROP TABLE IF EXISTS message_templates;
DROP TABLE IF EXISTS auto_reply_rules;
DROP TABLE IF EXISTS ai_configurations;

-- Drop main tables
DROP TABLE IF EXISTS rate_limits;
DROP TABLE IF EXISTS webhook_configs;
DROP TABLE IF EXISTS message_logs;
DROP TABLE IF EXISTS api_keys;
DROP TABLE IF EXISTS whatsapp_accounts;
DROP TABLE IF EXISTS workspace_users;
DROP TABLE IF EXISTS workspaces;

SET FOREIGN_KEY_CHECKS = 1;

-- ==========================================
-- STEP 2: Create main schema tables
-- ==========================================

-- Workspaces (tenants)
CREATE TABLE workspaces (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  subscription_tier VARCHAR(50) DEFAULT 'free',
  device_limit INT UNSIGNED DEFAULT 1,
  rate_limit_per_minute INT UNSIGNED DEFAULT 30,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_active (is_active),
  INDEX idx_created (created_at),
  INDEX idx_tier (subscription_tier)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Workspace users (linked to OAuth user IDs)
CREATE TABLE workspace_users (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  workspace_id INT UNSIGNED NOT NULL,
  oauth_user_id VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'owner',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  UNIQUE KEY unique_oauth_user (oauth_user_id),
  INDEX idx_workspace (workspace_id),
  INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- WhatsApp accounts (devices)
CREATE TABLE whatsapp_accounts (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  workspace_id INT UNSIGNED NOT NULL,
  provider VARCHAR(50) NOT NULL DEFAULT 'baileys',
  account_identifier VARCHAR(255) NOT NULL,
  phone_number VARCHAR(20),
  display_name VARCHAR(255),
  status ENUM('connecting', 'connected', 'disconnected', 'failed') DEFAULT 'connecting',
  provider_config JSON,
  device_api_key_hash VARCHAR(255) NULL,
  device_api_key_prefix VARCHAR(20) NULL,
  device_api_key_last_used_at TIMESTAMP NULL,
  qr_code TEXT,
  qr_expires_at TIMESTAMP NULL,
  last_connected_at TIMESTAMP NULL,
  baileys_disclaimer_accepted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  UNIQUE KEY unique_account_identifier (account_identifier),
  UNIQUE KEY unique_device_api_key (device_api_key_hash),
  INDEX idx_workspace_status (workspace_id, status),
  INDEX idx_provider (provider),
  INDEX idx_phone (phone_number),
  INDEX idx_status (status),
  INDEX idx_device_api_key_hash (device_api_key_hash),
  INDEX idx_device_api_key_prefix (device_api_key_prefix)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- API keys for workspace
CREATE TABLE api_keys (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  workspace_id INT UNSIGNED NOT NULL,
  key_hash VARCHAR(255) NOT NULL,
  key_prefix VARCHAR(20) NOT NULL,
  name VARCHAR(255),
  last_used_at TIMESTAMP NULL,
  expires_at TIMESTAMP NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  UNIQUE KEY unique_key_hash (key_hash),
  INDEX idx_workspace (workspace_id),
  INDEX idx_prefix (key_prefix),
  INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Message logs
CREATE TABLE message_logs (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  workspace_id INT UNSIGNED NOT NULL,
  account_id INT UNSIGNED NOT NULL,
  message_id VARCHAR(255),
  direction ENUM('incoming', 'outgoing') NOT NULL,
  from_number VARCHAR(20),
  to_number VARCHAR(20),
  message_type ENUM('text', 'image', 'document', 'video', 'audio') DEFAULT 'text',
  content TEXT,
  media_url VARCHAR(512),
  caption TEXT,
  status ENUM('pending', 'sent', 'delivered', 'read', 'failed', 'received') DEFAULT 'pending',
  error_message TEXT,
  provider_response JSON,
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  delivered_at TIMESTAMP NULL,
  read_at TIMESTAMP NULL,
  
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (account_id) REFERENCES whatsapp_accounts(id) ON DELETE CASCADE,
  INDEX idx_workspace_sent (workspace_id, sent_at),
  INDEX idx_account_sent (account_id, sent_at),
  INDEX idx_message_id (message_id),
  INDEX idx_direction_status (direction, status),
  INDEX idx_from_number (from_number),
  INDEX idx_to_number (to_number),
  INDEX idx_sent_at (sent_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Webhook configurations
CREATE TABLE webhook_configs (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  workspace_id INT UNSIGNED NOT NULL,
  url VARCHAR(512) NOT NULL,
  secret VARCHAR(255),
  events JSON,
  is_active BOOLEAN DEFAULT TRUE,
  last_triggered_at TIMESTAMP NULL,
  failure_count INT UNSIGNED DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  INDEX idx_workspace (workspace_id),
  INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Rate limiting tracking
CREATE TABLE rate_limits (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  workspace_id INT UNSIGNED NOT NULL,
  window_start TIMESTAMP NOT NULL,
  request_count INT UNSIGNED DEFAULT 0,
  
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  UNIQUE KEY unique_workspace_window (workspace_id, window_start),
  INDEX idx_window_start (window_start)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sample workspace
INSERT INTO workspaces (name, subscription_tier, device_limit, rate_limit_per_minute, is_active) VALUES
('Demo Workspace', 'professional', 10, 120, TRUE);

-- Sample workspace user
INSERT INTO workspace_users (workspace_id, oauth_user_id, email, full_name, role) VALUES
(1, 'oauth_user_123', 'demo@example.com', 'Demo User', 'owner');

-- ==========================================
-- STEP 3: Create automation tables
-- ==========================================

-- Auto-Reply Rules
CREATE TABLE auto_reply_rules (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  workspace_id INT UNSIGNED NOT NULL,
  account_id INT UNSIGNED NULL,
  name VARCHAR(255) NOT NULL,
  trigger_type ENUM('keyword', 'exact_match', 'contains', 'regex', 'business_hours', 'welcome', 'fallback') NOT NULL,
  trigger_value TEXT,
  reply_message TEXT NOT NULL,
  reply_type ENUM('text', 'template') DEFAULT 'text',
  template_id INT UNSIGNED NULL,
  is_active BOOLEAN DEFAULT TRUE,
  priority INT DEFAULT 0,
  delay_seconds INT DEFAULT 0,
  max_triggers_per_contact INT DEFAULT NULL,
  conditions JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (account_id) REFERENCES whatsapp_accounts(id) ON DELETE CASCADE,
  INDEX idx_workspace_active (workspace_id, is_active),
  INDEX idx_account (account_id),
  INDEX idx_trigger_type (trigger_type),
  INDEX idx_priority (priority)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- AI Configurations
CREATE TABLE ai_configurations (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  workspace_id INT UNSIGNED NOT NULL,
  account_id INT UNSIGNED NULL,
  is_enabled BOOLEAN DEFAULT FALSE,
  provider VARCHAR(50) DEFAULT 'openai',
  model VARCHAR(100) DEFAULT 'gpt-4',
  system_prompt TEXT,
  bot_name VARCHAR(255) DEFAULT 'Assistant',
  temperature DECIMAL(3,2) DEFAULT 0.7,
  max_tokens INT DEFAULT 500,
  auto_reply_enabled BOOLEAN DEFAULT FALSE,
  auto_reply_delay_seconds INT DEFAULT 2,
  language VARCHAR(10) DEFAULT 'en',
  fallback_message TEXT,
  conversation_memory_enabled BOOLEAN DEFAULT TRUE,
  conversation_memory_messages INT DEFAULT 10,
  rate_limit_per_hour INT DEFAULT 100,
  business_hours_only BOOLEAN DEFAULT FALSE,
  business_hours JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (account_id) REFERENCES whatsapp_accounts(id) ON DELETE CASCADE,
  UNIQUE KEY unique_workspace_account (workspace_id, account_id),
  INDEX idx_workspace (workspace_id),
  INDEX idx_enabled (is_enabled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Message Templates
CREATE TABLE message_templates (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  workspace_id INT UNSIGNED NOT NULL,
  name VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(100),
  variables JSON,
  media_url VARCHAR(512),
  media_type ENUM('image', 'document', 'video', 'audio') NULL,
  usage_count INT DEFAULT 0,
  last_used_at TIMESTAMP NULL,
  is_favorite BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  INDEX idx_workspace_category (workspace_id, category),
  INDEX idx_favorite (is_favorite),
  INDEX idx_usage (usage_count)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Contacts
CREATE TABLE contacts (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  workspace_id INT UNSIGNED NOT NULL,
  phone_number VARCHAR(20) NOT NULL,
  name VARCHAR(255),
  email VARCHAR(255),
  tags JSON,
  custom_fields JSON,
  notes TEXT,
  last_message_at TIMESTAMP NULL,
  message_count INT DEFAULT 0,
  is_blocked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  UNIQUE KEY unique_workspace_phone (workspace_id, phone_number),
  INDEX idx_workspace (workspace_id),
  INDEX idx_phone (phone_number),
  INDEX idx_email (email),
  INDEX idx_blocked (is_blocked),
  INDEX idx_last_message (last_message_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Contact Groups
CREATE TABLE contact_groups (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  workspace_id INT UNSIGNED NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  contact_ids JSON,
  contact_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  INDEX idx_workspace (workspace_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Broadcast Messages
CREATE TABLE broadcast_messages (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  workspace_id INT UNSIGNED NOT NULL,
  account_id INT UNSIGNED NOT NULL,
  name VARCHAR(255),
  message TEXT NOT NULL,
  template_id INT UNSIGNED NULL,
  media_url VARCHAR(512),
  media_type ENUM('image', 'document', 'video', 'audio') NULL,
  target_type ENUM('all_contacts', 'group', 'custom') NOT NULL,
  target_group_id INT UNSIGNED NULL,
  target_phone_numbers JSON,
  status ENUM('draft', 'scheduled', 'sending', 'completed', 'failed') DEFAULT 'draft',
  scheduled_at TIMESTAMP NULL,
  started_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  total_recipients INT DEFAULT 0,
  sent_count INT DEFAULT 0,
  failed_count INT DEFAULT 0,
  created_by INT UNSIGNED,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (account_id) REFERENCES whatsapp_accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (template_id) REFERENCES message_templates(id) ON DELETE SET NULL,
  FOREIGN KEY (target_group_id) REFERENCES contact_groups(id) ON DELETE SET NULL,
  INDEX idx_workspace_status (workspace_id, status),
  INDEX idx_account (account_id),
  INDEX idx_scheduled (scheduled_at),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Scheduled Messages
CREATE TABLE scheduled_messages (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  workspace_id INT UNSIGNED NOT NULL,
  account_id INT UNSIGNED NOT NULL,
  recipient VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  media_url VARCHAR(512),
  media_type ENUM('image', 'document', 'video', 'audio') NULL,
  scheduled_at TIMESTAMP NOT NULL,
  status ENUM('pending', 'sent', 'failed', 'cancelled') DEFAULT 'pending',
  sent_at TIMESTAMP NULL,
  message_id VARCHAR(255),
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (account_id) REFERENCES whatsapp_accounts(id) ON DELETE CASCADE,
  INDEX idx_workspace_status (workspace_id, status),
  INDEX idx_account (account_id),
  INDEX idx_scheduled (scheduled_at),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Conversation Logs
CREATE TABLE conversation_logs (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  workspace_id INT UNSIGNED NOT NULL,
  account_id INT UNSIGNED NOT NULL,
  contact_phone VARCHAR(20) NOT NULL,
  role ENUM('user', 'assistant', 'system') NOT NULL,
  content TEXT NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (account_id) REFERENCES whatsapp_accounts(id) ON DELETE CASCADE,
  INDEX idx_workspace_contact (workspace_id, contact_phone, timestamp),
  INDEX idx_account_contact (account_id, contact_phone, timestamp),
  INDEX idx_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sample automation data
INSERT INTO message_templates (workspace_id, name, content, category, variables) VALUES
(1, 'Welcome Message', 'Hi {{name}}! 👋 Welcome to our service. How can I help you today?', 'greeting', '["name"]'),
(1, 'Business Hours', 'Thank you for your message! Our business hours are Mon-Fri, 9AM-5PM. We''ll respond during business hours.', 'support', '[]'),
(1, 'Away Message', 'I''m currently away. I''ll get back to you as soon as possible. For urgent matters, call +1234567890.', 'support', '[]');

INSERT INTO auto_reply_rules (workspace_id, name, trigger_type, trigger_value, reply_message, priority, is_active) VALUES
(1, 'Welcome New Contacts', 'welcome', NULL, 'Hi! 👋 Thanks for reaching out. How can I assist you today?', 100, TRUE),
(1, 'Pricing Inquiry', 'contains', 'price,pricing,cost,how much', 'Thanks for your interest! Our pricing starts at $99/month. Visit our website for details.', 90, TRUE);

INSERT INTO ai_configurations (workspace_id, is_enabled, system_prompt, bot_name, auto_reply_enabled) VALUES
(1, FALSE, 'You are a helpful customer support assistant. Be friendly, professional, and concise.', 'Support Bot', FALSE);

SELECT '✅ Database initialization complete!' AS Status;

