const mysql = require('mysql2/promise');
const { getDbConfig } = require('./config');
const { createSecureApp } = require('./secureApp');

async function start() {
  const pool = mysql.createPool(getDbConfig());
  const app = createSecureApp(pool);
  const port = process.env.PORT || 3000;

  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => {
      // eslint-disable-next-line no-console
      console.log(`Secure server listening on port ${port}`);
      resolve(server);
    });
    server.on('error', reject);
  });
}

if (require.main === module) {
  start().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Failed to launch secure server', err);
    process.exitCode = 1;
  });
}

module.exports = { start };
