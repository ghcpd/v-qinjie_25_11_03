const express = require('express');

/**
 * Factory for creating the insecure application preserved for regression checks.
 * The connection object is expected to expose a `query(sql, callback)` API similar to mysql.
 */
function createInsecureApp(connection) {
  const app = express();

  app.get('/user', (req, res) => {
    const username = req.query.username;
    const query = `SELECT * FROM users WHERE username = '${username}'`;

    connection.query(query, (err, results) => {
      if (err) {
        res.status(500).json({ error: 'database_error', detail: err.message });
        return;
      }
      res.json(results);
    });
  });

  return app;
}

module.exports = { createInsecureApp };
