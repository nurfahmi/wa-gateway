-- ============================================
-- WhatsApp Gateway SaaS - Database Schema
-- ============================================

-- Drop tables if exists (for clean reinstall)
DROP TABLE IF EXISTS rate_limits;
DROP TABLE IF EXISTS webhook_configs;
DROP TABLE IF EXISTS message_logs;
DROP TABLE IF EXISTS api_keys;
DROP TABLE IF EXISTS whatsapp_accounts;
DROP TABLE IF EXISTS workspace_users;
DROP TABLE IF EXISTS workspaces;

-- ============================================
-- Workspaces (tenants)
-- ============================================
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

-- ============================================
-- Workspace users (linked to OAuth user IDs)
-- ============================================
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

-- ============================================
-- WhatsApp accounts (devices)
-- ============================================
CREATE TABLE whatsapp_accounts (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  workspace_id INT UNSIGNED NOT NULL,
  provider VARCHAR(50) NOT NULL DEFAULT 'baileys',
  account_identifier VARCHAR(255) NOT NULL,
  phone_number VARCHAR(20),
  display_name VARCHAR(255),
  status ENUM('connecting', 'connected', 'disconnected', 'failed') DEFAULT 'connecting',
  provider_config JSON,
  qr_code TEXT,
  qr_expires_at TIMESTAMP NULL,
  last_connected_at TIMESTAMP NULL,
  baileys_disclaimer_accepted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  UNIQUE KEY unique_account_identifier (account_identifier),
  INDEX idx_workspace_status (workspace_id, status),
  INDEX idx_provider (provider),
  INDEX idx_phone (phone_number),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- API keys for workspace
-- ============================================
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

-- ============================================
-- Message logs
-- ============================================
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

-- ============================================
-- Webhook configurations
-- ============================================
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

-- ============================================
-- Rate limiting tracking
-- ============================================
CREATE TABLE rate_limits (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  workspace_id INT UNSIGNED NOT NULL,
  window_start TIMESTAMP NOT NULL,
  request_count INT UNSIGNED DEFAULT 0,
  
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  UNIQUE KEY unique_workspace_window (workspace_id, window_start),
  INDEX idx_window_start (window_start)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Sample data for development
-- ============================================

-- Sample workspace
INSERT INTO workspaces (name, subscription_tier, device_limit, rate_limit_per_minute, is_active) VALUES
('Demo Workspace', 'professional', 10, 120, TRUE);

-- Sample workspace user (linked to OAuth ID)
INSERT INTO workspace_users (workspace_id, oauth_user_id, email, full_name, role) VALUES
(1, 'oauth_user_123', 'demo@example.com', 'Demo User', 'owner');

