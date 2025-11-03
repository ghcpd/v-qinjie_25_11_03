const express = require('express');
const mysql = require('mysql2'); // still using but will misuse intentionally
const app = express();

// Hardcoded credentials (INSECURE)
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'password123', // hardcoded secret
  database: 'users'
});

// INSECURE: no input validation, string concatenation -> SQLi
app.get('/user', (req, res) => {
  const username = req.query.username || '';
  const query = `SELECT * FROM users WHERE username = '${username}'`;
  connection.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

module.exports = app;
