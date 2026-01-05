-- ============================================
-- Automation & AI Features - Database Schema
-- ============================================

-- Drop tables if exists (for clean reinstall)
DROP TABLE IF EXISTS conversation_logs;
DROP TABLE IF EXISTS scheduled_messages;
DROP TABLE IF EXISTS broadcast_messages;
DROP TABLE IF EXISTS contact_groups;
DROP TABLE IF EXISTS contacts;
DROP TABLE IF EXISTS message_templates;
DROP TABLE IF EXISTS auto_reply_rules;
DROP TABLE IF EXISTS ai_configurations;

-- ============================================
-- Auto-Reply Rules
-- ============================================
CREATE TABLE auto_reply_rules (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  workspace_id INT UNSIGNED NOT NULL,
  account_id INT UNSIGNED NULL, -- NULL = applies to all accounts
  name VARCHAR(255) NOT NULL,
  trigger_type ENUM('keyword', 'exact_match', 'contains', 'regex', 'business_hours', 'welcome', 'fallback') NOT NULL,
  trigger_value TEXT, -- keyword, regex pattern, or time range JSON
  reply_message TEXT NOT NULL,
  reply_type ENUM('text', 'template') DEFAULT 'text',
  template_id INT UNSIGNED NULL,
  is_active BOOLEAN DEFAULT TRUE,
  priority INT DEFAULT 0, -- Higher priority runs first
  delay_seconds INT DEFAULT 0, -- Delay before sending reply
  max_triggers_per_contact INT DEFAULT NULL, -- NULL = unlimited
  conditions JSON, -- Additional conditions: day_of_week, time_range, etc.
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (account_id) REFERENCES whatsapp_accounts(id) ON DELETE CASCADE,
  INDEX idx_workspace_active (workspace_id, is_active),
  INDEX idx_account (account_id),
  INDEX idx_trigger_type (trigger_type),
  INDEX idx_priority (priority)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- AI Configurations
-- ============================================
CREATE TABLE ai_configurations (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  workspace_id INT UNSIGNED NOT NULL,
  account_id INT UNSIGNED NULL, -- NULL = default for workspace
  is_enabled BOOLEAN DEFAULT FALSE,
  provider VARCHAR(50) DEFAULT 'openai', -- openai, anthropic, etc.
  model VARCHAR(100) DEFAULT 'gpt-4', -- gpt-4, gpt-3.5-turbo, etc.
  system_prompt TEXT, -- Custom instructions for AI
  bot_name VARCHAR(255) DEFAULT 'Assistant',
  temperature DECIMAL(3,2) DEFAULT 0.7,
  max_tokens INT DEFAULT 500,
  auto_reply_enabled BOOLEAN DEFAULT FALSE, -- Auto-reply to all messages
  auto_reply_delay_seconds INT DEFAULT 2,
  language VARCHAR(10) DEFAULT 'en',
  fallback_message TEXT, -- Message when AI fails
  conversation_memory_enabled BOOLEAN DEFAULT TRUE,
  conversation_memory_messages INT DEFAULT 10, -- Last N messages to remember
  rate_limit_per_hour INT DEFAULT 100,
  business_hours_only BOOLEAN DEFAULT FALSE,
  business_hours JSON, -- {"monday": ["09:00-17:00"], ...}
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (account_id) REFERENCES whatsapp_accounts(id) ON DELETE CASCADE,
  UNIQUE KEY unique_workspace_account (workspace_id, account_id),
  INDEX idx_workspace (workspace_id),
  INDEX idx_enabled (is_enabled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Message Templates
-- ============================================
CREATE TABLE message_templates (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  workspace_id INT UNSIGNED NOT NULL,
  name VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(100), -- greeting, support, sales, etc.
  variables JSON, -- ["name", "date", "amount"] - available {{variables}}
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

-- ============================================
-- Contacts
-- ============================================
CREATE TABLE contacts (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  workspace_id INT UNSIGNED NOT NULL,
  phone_number VARCHAR(20) NOT NULL,
  name VARCHAR(255),
  email VARCHAR(255),
  tags JSON, -- ["vip", "customer", "lead"]
  custom_fields JSON, -- {"company": "Acme Inc", "status": "active"}
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

-- ============================================
-- Contact Groups
-- ============================================
CREATE TABLE contact_groups (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  workspace_id INT UNSIGNED NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  contact_ids JSON, -- Array of contact IDs
  contact_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  INDEX idx_workspace (workspace_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Broadcast Messages
-- ============================================
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
  target_phone_numbers JSON, -- Array of phone numbers for custom
  status ENUM('draft', 'scheduled', 'sending', 'completed', 'failed') DEFAULT 'draft',
  scheduled_at TIMESTAMP NULL,
  started_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  total_recipients INT DEFAULT 0,
  sent_count INT DEFAULT 0,
  failed_count INT DEFAULT 0,
  created_by INT UNSIGNED, -- workspace_user_id
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

-- ============================================
-- Scheduled Messages (Individual)
-- ============================================
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
  message_id VARCHAR(255), -- WhatsApp message ID after sent
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

-- ============================================
-- Conversation Logs (for AI context)
-- ============================================
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

-- ============================================
-- Sample Data for Development
-- ============================================

-- Sample message templates
INSERT INTO message_templates (workspace_id, name, content, category, variables) VALUES
(1, 'Welcome Message', 'Hi {{name}}! 👋 Welcome to our service. How can I help you today?', 'greeting', '["name"]'),
(1, 'Business Hours', 'Thank you for your message! Our business hours are Mon-Fri, 9AM-5PM. We''ll respond during business hours.', 'support', '[]'),
(1, 'Away Message', 'I''m currently away. I''ll get back to you as soon as possible. For urgent matters, call +1234567890.', 'support', '[]'),
(1, 'Order Confirmation', 'Your order #{{order_id}} has been confirmed! Total: ${{amount}}. Estimated delivery: {{date}}.', 'sales', '["order_id", "amount", "date"]');

-- Sample auto-reply rules
INSERT INTO auto_reply_rules (workspace_id, name, trigger_type, trigger_value, reply_message, priority, is_active) VALUES
(1, 'Welcome New Contacts', 'welcome', NULL, 'Hi! 👋 Thanks for reaching out. How can I assist you today?', 100, TRUE),
(1, 'Pricing Inquiry', 'contains', 'price,pricing,cost,how much', 'Thanks for your interest! Our pricing starts at $99/month. Visit https://example.com/pricing for details.', 90, TRUE),
(1, 'Support Request', 'contains', 'help,support,problem,issue', 'I''ll connect you with our support team right away. Please describe your issue.', 80, TRUE),
(1, 'Business Hours', 'business_hours', '{"outside_hours": true}', 'Thanks for your message! We''re currently offline. Business hours: Mon-Fri 9AM-5PM EST.', 70, TRUE);

-- Sample AI configuration
INSERT INTO ai_configurations (workspace_id, is_enabled, system_prompt, bot_name, auto_reply_enabled) VALUES
(1, FALSE, 'You are a helpful customer support assistant. Be friendly, professional, and concise. If you don''t know something, admit it and offer to connect the user with a human agent.', 'Support Bot', FALSE);

-- Sample contacts
INSERT INTO contacts (workspace_id, phone_number, name, tags) VALUES
(1, '1234567890', 'John Doe', '["customer", "vip"]'),
(1, '0987654321', 'Jane Smith', '["lead"]');

