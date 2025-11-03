const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const { initPool } = require('../config/database');
const { logger } = require('./logger');

const app = express();

app.disable('x-powered-by');
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));
app.use(helmet());

const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS || 60000);
const max = Number(process.env.RATE_LIMIT_MAX || 30);
app.use(rateLimit({ windowMs, max }));

app.get('/healthz', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/user', async (req, res) => {
  const { username } = req.query;

  if (typeof username !== 'string' || username.trim().length === 0) {
    return res.status(400).json({ error: 'username query parameter is required' });
  }

  const normalizedUsername = username.trim();
  if (!/^[A-Za-z0-9_.@-]{3,64}$/.test(normalizedUsername)) {
    return res.status(400).json({ error: 'Invalid username format supplied' });
  }

  try {
    const pool = await initPool();
    const [rows] = await pool.execute(
      'SELECT id, username, email FROM users WHERE username = ?',
      [normalizedUsername]
    );

    const requestId = crypto.randomUUID();
    logger.info({ username: normalizedUsername, requestId }, 'Successful user lookup');
    return res.json({ requestId, results: rows });
  } catch (err) {
    logger.error({ err }, 'Database query failed');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.use((err, _req, res, _next) => {
  logger.error({ err }, 'Unhandled error');
  res.status(500).json({ error: 'Unexpected error occurred' });
});

module.exports = app;
