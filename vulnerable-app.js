const express = require('express');
const app = express();
const mysql = require('mysql');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// VULNERABILITY 1: Hardcoded Credentials
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'password123', // hardcoded secret
  database: 'users'
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// VULNERABILITY 2: SQL Injection
app.get('/user', (req, res) => {
  const username = req.query.username;
  const query = `SELECT * FROM users WHERE username = '${username}'`; // vulnerable to SQL injection
  connection.query(query, (err, results) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(results);
  });
});

// VULNERABILITY 3: SQL Injection in POST endpoint
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const query = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;
  connection.query(query, (err, results) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (results.length > 0) {
      res.json({ success: true, message: 'Login successful' });
    } else {
      res.json({ success: false, message: 'Invalid credentials' });
    }
  });
});

// VULNERABILITY 4: Command Injection
app.get('/ping', (req, res) => {
  const host = req.query.host;
  exec(`ping -c 4 ${host}`, (err, stdout, stderr) => {
    if (err) {
      res.status(500).json({ error: stderr });
      return;
    }
    res.json({ output: stdout });
  });
});

// VULNERABILITY 5: Path Traversal / Insecure File Handling
app.get('/download', (req, res) => {
  const filename = req.query.file;
  const filePath = path.join(__dirname, 'uploads', filename);
  
  // No validation - allows path traversal
  res.download(filePath, (err) => {
    if (err) {
      res.status(404).json({ error: 'File not found' });
    }
  });
});

// VULNERABILITY 6: Insufficient Input Validation
app.post('/upload', (req, res) => {
  const { filename, content } = req.body;
  
  // No validation on filename or content
  const filePath = path.join(__dirname, 'uploads', filename);
  fs.writeFileSync(filePath, content);
  
  res.json({ message: 'File uploaded successfully', path: filePath });
});

// VULNERABILITY 7: Information Disclosure
app.get('/debug', (req, res) => {
  res.json({
    env: process.env,
    cwd: process.cwd(),
    platform: process.platform
  });
});

app.listen(3000, () => console.log('Vulnerable server running on port 3000'));
