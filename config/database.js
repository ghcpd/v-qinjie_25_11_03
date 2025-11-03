const mysql = require('mysql2/promise');
const { logger } = require('../src/logger');

let pool;

async function initPool() {
  if (pool) {
    return pool;
  }

  const {
    DB_HOST,
    DB_USER,
    DB_PASSWORD,
    DB_NAME,
    DB_PORT
  } = process.env;

  if (!DB_HOST || !DB_USER || !DB_NAME) {
    throw new Error('Database configuration missing required environment variables');
  }

  pool = mysql.createPool({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    port: DB_PORT ? Number(DB_PORT) : 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true
  });

  pool.on('connection', () => {
    logger.debug('MySQL connection acquired');
  });

  pool.on('error', (err) => {
    logger.error({ err }, 'MySQL connection pool error');
  });

  return pool;
}

async function closePool() {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}

module.exports = {
  initPool,
  closePool
};
