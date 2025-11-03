const mysql = require('mysql2/promise');

function createPool() {
  const config = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_POOL_SIZE || 10),
    queueLimit: 0,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : undefined
  };

  ['host', 'user', 'password', 'database'].forEach((key) => {
    if (!config[key]) {
      throw new Error(`Missing required database configuration: ${key}`);
    }
  });

  return mysql.createPool(config);
}

function createUserService(pool) {
  if (!pool || typeof pool.execute !== 'function') {
    throw new Error('A mysql2 pool instance is required');
  }

  return {
    async findByUsername(username) {
      const [rows] = await pool.execute(
        'SELECT id, username, email FROM users WHERE username = ?',
        [username]
      );
      return rows.map((row) => ({
        id: row.id,
        username: row.username,
        email: row.email
      }));
    }
  };
}

module.exports = { createPool, createUserService };
