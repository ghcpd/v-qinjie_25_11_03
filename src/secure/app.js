const express = require('express');
const helmet = require('helmet');
const mysql = require('mysql2/promise');
const Ajv = require('ajv');
require('dotenv').config();

const app = express();
app.use(helmet());

// Environment-based configuration (SECURE)
const {
  DB_HOST = 'localhost',
  DB_USER = 'root',
  DB_PASSWORD = '',
  DB_NAME = 'users'
} = process.env;

let pool;
async function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: DB_HOST,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      connectionLimit: 5
    });
  }
  return pool;
}

// Input validation schema
const ajv = new Ajv({ coerceTypes: true, allErrors: true });
const querySchema = {
  type: 'object',
  properties: {
    username: { type: 'string', minLength: 1, maxLength: 50, pattern: '^[A-Za-z0-9_]+$' }
  },
  required: ['username'],
  additionalProperties: false
};
const validateQuery = ajv.compile(querySchema);

app.get('/user', async (req, res) => {
  const q = { username: req.query.username };
  if (!validateQuery(q)) {
    return res.status(400).json({ error: 'Invalid username', details: validateQuery.errors });
  }
  try {
    const pool = await getPool();
    const [rows] = await pool.execute('SELECT * FROM users WHERE username = ?', [q.username]);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: 'Internal error' });
  }
});

module.exports = app;
