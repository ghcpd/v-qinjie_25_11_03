require('dotenv').config();
const { createApp } = require('./app');
const { createPool, createUserService } = require('./userService');

async function start() {
  const pool = createPool();
  const userService = createUserService(pool);
  const app = createApp({ userService });
  const port = Number(process.env.PORT || 3000);

  const server = app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });

  const shutdown = async () => {
    server.close();
    await pool.end();
  };

  return { app, server, shutdown };
}

if (require.main === module) {
  start().catch((err) => {
    console.error('Failed to start server', err);
    process.exit(1);
  });
}

module.exports = { start };
