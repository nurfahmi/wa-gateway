const mysql = require('mysql2/promise');
const config = require('./index');
const logger = require('../utils/logger');

// Create connection pool
const pool = mysql.createPool({
  host: config.db.host,
  port: config.db.port,
  database: config.db.database,
  user: config.db.user,
  password: config.db.password,
  connectionLimit: config.db.connectionLimit,
  waitForConnections: config.db.waitForConnections,
  queueLimit: config.db.queueLimit,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Test connection
pool.getConnection()
  .then(connection => {
    logger.info('Database connected successfully');
    connection.release();
  })
  .catch(err => {
    logger.error('Database connection failed:', err);
    process.exit(1);
  });

// Handle pool errors
pool.on('error', (err) => {
  logger.error('MySQL pool error:', err);
});

module.exports = pool;

