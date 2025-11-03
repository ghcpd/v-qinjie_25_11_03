const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { query, validationResult } = require('express-validator');

/**
 * Factory for creating the secured application instance.
 * The connection object is expected to implement an async `execute(sql, params)` signature (mysql2/promise).
 */
function createSecureApp(connection) {
  const app = express();

  app.use(express.json({ limit: '10kb' }));
  app.use(helmet());
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100,
      standardHeaders: true,
      legacyHeaders: false
    })
  );

  app.get(
    '/user',
    query('username')
      .exists().withMessage('username is required')
      .bail()
      .isString().withMessage('username must be a string')
      .bail()
      .isLength({ min: 3, max: 64 }).withMessage('username length out of range')
      .bail()
      .matches(/^[\w.@-]+$/).withMessage('username contains invalid characters')
      .trim(),
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'validation_error', details: errors.array() });
      }

      const { username } = req.query;
      const sql = 'SELECT user_id, username, email FROM users WHERE username = ? LIMIT 1';

      try {
        const [rows] = await connection.execute(sql, [username]);
        res.json(rows);
      } catch (err) {
        res.status(500).json({ error: 'database_error', detail: err.message });
      }
    }
  );

  return app;
}

module.exports = { createSecureApp };
