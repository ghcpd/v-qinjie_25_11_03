jest.setTimeout(30000);
process.env.DB_HOST = process.env.DB_HOST || 'localhost';
process.env.DB_USER = process.env.DB_USER || 'test_user';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'test_password';
process.env.DB_NAME = process.env.DB_NAME || 'users';
process.env.DB_PORT = process.env.DB_PORT || '3306';
process.env.PORT = process.env.PORT || '0';
process.env.RATE_LIMIT_WINDOW_MS = process.env.RATE_LIMIT_WINDOW_MS || '1000';
process.env.RATE_LIMIT_MAX = process.env.RATE_LIMIT_MAX || '1000';
