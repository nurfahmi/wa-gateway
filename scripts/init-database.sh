#!/bin/bash

echo "🔧 Initializing WhatsApp Gateway Database..."
echo ""

# Read database credentials from .env file
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Default values if not in .env
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-3306}
DB_USER=${DB_USER:-root}
DB_NAME=${DB_NAME:-whatsapp_gateway}

echo "📊 Database Configuration:"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo "  User: $DB_USER"
echo "  Database: $DB_NAME"
echo ""

# Prompt for password
echo "Please enter your MySQL password:"
read -s DB_PASSWORD

echo ""
echo "🗑️  Dropping existing tables..."

# Drop all tables
mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME << 'EOF'
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS rate_limits;
DROP TABLE IF EXISTS webhook_configs;
DROP TABLE IF EXISTS message_logs;
DROP TABLE IF EXISTS api_keys;
DROP TABLE IF EXISTS whatsapp_accounts;
DROP TABLE IF EXISTS workspace_users;
DROP TABLE IF EXISTS workspaces;

DROP TABLE IF EXISTS conversation_logs;
DROP TABLE IF EXISTS scheduled_messages;
DROP TABLE IF EXISTS broadcast_messages;
DROP TABLE IF EXISTS contact_groups;
DROP TABLE IF EXISTS contacts;
DROP TABLE IF EXISTS message_templates;
DROP TABLE IF EXISTS auto_reply_rules;
DROP TABLE IF EXISTS ai_configurations;

SET FOREIGN_KEY_CHECKS = 1;
EOF

if [ $? -ne 0 ]; then
    echo "❌ Failed to drop tables"
    exit 1
fi

echo "✅ Tables dropped"
echo ""
echo "📦 Creating main schema..."

# Create main tables
mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME < database/schema.sql

if [ $? -ne 0 ]; then
    echo "❌ Failed to create main schema"
    exit 1
fi

echo "✅ Main schema created"
echo ""
echo "🤖 Creating automation schema..."

# Create automation tables
mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME < database/automation-schema.sql

if [ $? -ne 0 ]; then
    echo "❌ Failed to create automation schema"
    exit 1
fi

echo "✅ Automation schema created"
echo ""
echo "🎉 Database initialization complete!"
echo ""
echo "You can now start the server:"
echo "  npm start"
echo ""
echo "And login at:"
echo "  http://localhost:3000/dev-login"



