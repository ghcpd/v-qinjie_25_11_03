const mysql = require('mysql');
const { createInsecureApp } = require('./insecureApp');

const port = process.env.PORT || 3000;

// Intentionally mirrors the insecure configuration from the assessment input.
const connection = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'password123',
  database: process.env.DB_NAME || 'users'
});

const app = createInsecureApp(connection);

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Insecure server listening on port ${port}`);
});
