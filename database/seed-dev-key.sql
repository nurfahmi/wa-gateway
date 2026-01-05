-- Seed development workspace and API key
-- This script is idempotent - safe to run multiple times

-- Create development workspace if not exists
INSERT INTO workspaces (name, subscription_tier, device_limit, rate_limit_per_minute, is_active)
SELECT 'Development Workspace', 'enterprise', 50, 300, TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM workspaces WHERE name = 'Development Workspace'
);

-- Create development user if not exists
INSERT INTO workspace_users (workspace_id, oauth_user_id, email, full_name, role)
SELECT 
    (SELECT id FROM workspaces WHERE name = 'Development Workspace' LIMIT 1),
    'dev_user_123',
    'dev@example.com',
    'Development User',
    'owner'
WHERE NOT EXISTS (
    SELECT 1 FROM workspace_users WHERE oauth_user_id = 'dev_user_123'
);

-- Note: API key will be seeded via Node.js script to handle hashing

