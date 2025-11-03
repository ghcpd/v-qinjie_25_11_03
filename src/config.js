const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: process.env.ENV_FILE || path.resolve(process.cwd(), '.env') });

function getDbConfig() {
  return {
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'db_user',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'users',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  };
}

module.exports = {
  getDbConfig
};
