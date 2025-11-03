require('dotenv').config();
const http = require('http');
const app = require('./app');
const { logger } = require('./logger');
const { initPool, closePool } = require('../config/database');

const port = Number(process.env.PORT || 3000);
let server;

async function start() {
  try {
    await initPool();
    server = http.createServer(app);

    server.listen(port, () => {
      logger.info(`Server running on port ${port}`);
    });
  } catch (err) {
    logger.error({ err }, 'Failed to start server');
    process.exit(1);
  }
}

async function shutdown() {
  logger.info('Shutting down server');
  if (server) {
    await new Promise((resolve, reject) => {
      server.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  await closePool();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

start();

module.exports = { start, shutdown };
