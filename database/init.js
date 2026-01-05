#!/usr/bin/env node

/**
 * Database initialization script
 * Creates tables and seeds development data
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();

// Import after dotenv is loaded
const db = require('../src/config/database');
const logger = require('../src/utils/logger');
const config = require('../src/config');

function hashApiKey(apiKey) {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

async function runSqlFile(filePath) {
  const sql = fs.readFileSync(filePath, 'utf8');
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  for (const statement of statements) {
    await db.query(statement);
  }
}

async function seedDevApiKey() {
  const devApiKey = config.dev.apiKey;
  
  if (!devApiKey) {
    console.log('⚠️  No DEV_API_KEY found in .env - skipping dev key seeding');
    return;
  }

  try {
    // Get workspace ID
    const [workspaces] = await db.query(
      "SELECT id FROM workspaces WHERE name = 'Development Workspace' LIMIT 1"
    );

    if (workspaces.length === 0) {
      console.log('⚠️  Development workspace not found - skipping dev key seeding');
      return;
    }

    const workspaceId = workspaces[0].id;
    const keyHash = hashApiKey(devApiKey);
    const keyPrefix = devApiKey.substring(0, 12);

    // Check if key already exists
    const [existing] = await db.query(
      'SELECT id FROM api_keys WHERE key_hash = ?',
      [keyHash]
    );

    if (existing.length > 0) {
      console.log('✓ Development API key already exists');
      return;
    }

    // Insert the dev API key
    await db.query(
      `INSERT INTO api_keys (workspace_id, key_hash, key_prefix, name, is_active) 
       VALUES (?, ?, ?, ?, TRUE)`,
      [workspaceId, keyHash, keyPrefix, 'Development Key (from .env)']
    );

    console.log('✓ Development API key seeded successfully');
    console.log('\nYour API Key: ' + devApiKey);
    console.log('\nUsage:');
    console.log(`  curl http://localhost:${config.app.port}/api/accounts \\`);
    console.log(`    -H "X-API-Key: ${devApiKey}"\n`);
  } catch (error) {
    console.error('Error seeding dev API key:', error.message);
  }
}

async function initialize() {
  try {
    console.log('Starting database initialization...\n');

    // Check if api_keys table exists (most important for our use case)
    const [tables] = await db.query('SHOW TABLES LIKE "api_keys"');
    
    if (tables.length === 0) {
      // Fresh install - run complete setup
      console.log('Creating tables...');
      await runSqlFile(path.join(__dirname, 'complete-setup.sql'));
      console.log('✓ Tables created\n');
    } else {
      console.log('✓ Tables already exist\n');
    }

    // Seed development workspace
    console.log('Seeding development data...');
    await runSqlFile(path.join(__dirname, 'seed-dev-key.sql'));
    console.log('✓ Development workspace created\n');

    // Seed dev API key if configured
    await seedDevApiKey();

    console.log('\n✅ Database initialization complete!\n');
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await db.end();
  }
}

// Run initialization
initialize();
