#!/usr/bin/env node

/**
 * Helper script to generate device/user API keys
 * Usage: node scripts/generate-api-key.js [workspace_id] [key_name]
 */

const crypto = require('crypto');
const db = require('../src/config/database');
const logger = require('../src/utils/logger');

// Crypto utilities
function generateApiKey(prefix = 'gw_live') {
  const randomBytes = crypto.randomBytes(32).toString('hex');
  return `${prefix}_${randomBytes}`;
}

function hashApiKey(apiKey) {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

async function createApiKey() {
  let connection;
  
  try {
    const workspaceId = process.argv[2] ? parseInt(process.argv[2]) : null;
    const keyName = process.argv[3] || 'Generated Key';

    connection = await db.getConnection();

    // If no workspace ID provided, use first workspace
    let targetWorkspaceId = workspaceId;
    if (!targetWorkspaceId) {
      const [workspaces] = await connection.query(
        'SELECT id, name FROM workspaces WHERE is_active = TRUE LIMIT 1'
      );
      
      if (workspaces.length === 0) {
        console.error('❌ No active workspaces found. Run npm run db:init first.');
        process.exit(1);
      }
      
      targetWorkspaceId = workspaces[0].id;
      console.log(`Using workspace: ${workspaces[0].name} (ID: ${targetWorkspaceId})\n`);
    }

    // Generate API key
    const apiKey = generateApiKey('gw_live');
    const keyHash = hashApiKey(apiKey);
    const keyPrefix = apiKey.substring(0, 12);

    // Insert into database
    const [result] = await connection.query(
      `INSERT INTO api_keys (workspace_id, key_hash, key_prefix, name, is_active) 
       VALUES (?, ?, ?, ?, TRUE)`,
      [targetWorkspaceId, keyHash, keyPrefix, keyName]
    );

    console.log('='.repeat(80));
    console.log('✅ API KEY CREATED SUCCESSFULLY');
    console.log('='.repeat(80));
    console.log('\nWorkspace ID:', targetWorkspaceId);
    console.log('Key Name:', keyName);
    console.log('Key ID:', result.insertId);
    console.log('\nYour API Key (SAVE THIS - it will not be shown again):');
    console.log('\n  ' + apiKey);
    console.log('\n' + '='.repeat(80));
    console.log('\nUsage Example:');
    console.log('\n  curl http://localhost:4000/api/accounts \\');
    console.log('    -H "X-API-Key: ' + apiKey + '"');
    console.log('\n' + '='.repeat(80) + '\n');

  } catch (error) {
    console.error('❌ Error creating API key:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      connection.release();
    }
    await db.end();
  }
}

// Show usage if --help
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Usage: node scripts/generate-api-key.js [workspace_id] [key_name]

Arguments:
  workspace_id  Optional. Workspace ID to create key for (defaults to first workspace)
  key_name      Optional. Name for the API key (defaults to "Generated Key")

Examples:
  node scripts/generate-api-key.js
  node scripts/generate-api-key.js 1 "Production Server"
  node scripts/generate-api-key.js 2 "Development Key"

Notes:
  - API keys are in format: gw_live_<64_hex_characters>
  - Keys are stored hashed in the database
  - The plaintext key is shown only once
  `);
  process.exit(0);
}

// Run
createApiKey();

