const express = require('express');
const app = express();
const mysql = require('mysql');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config(); // Load environment variables

// FIX 1: Use environment variables instead of hardcoded credentials
const connection = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'appuser',
  password: process.env.DB_PASSWORD, // From environment variable
  database: process.env.DB_NAME || 'users'
});

app.use(express.json({ limit: '1mb' })); // Limit request size
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Input validation helper functions
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return '';
  return input.trim();
};

const isValidUsername = (username) => {
  // Only allow alphanumeric characters and underscores
  const regex = /^[a-zA-Z0-9_]{3,20}$/;
  return regex.test(username);
};

const isValidHostname = (host) => {
  // Only allow valid hostnames or IP addresses
  const hostnameRegex = /^[a-zA-Z0-9][a-zA-Z0-9-_.]*[a-zA-Z0-9]$/;
  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
  return hostnameRegex.test(host) || ipRegex.test(host);
};

const isValidFilename = (filename) => {
  // Only allow safe filenames
  const regex = /^[a-zA-Z0-9_-]+\.[a-zA-Z0-9]+$/;
  return regex.test(filename) && !filename.includes('..') && !filename.includes('/') && !filename.includes('\\');
};

// FIX 2: Use parameterized queries to prevent SQL Injection
app.get('/user', (req, res) => {
  const username = sanitizeInput(req.query.username);
  
  // Validate input
  if (!isValidUsername(username)) {
    return res.status(400).json({ error: 'Invalid username format' });
  }
  
  // Use parameterized query
  const query = 'SELECT id, username, email FROM users WHERE username = ?';
  connection.query(query, [username], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      res.status(500).json({ error: 'Internal server error' });
      return;
    }
    res.json(results);
  });
});

// FIX 3: Secure login with parameterized queries and password hashing
app.post('/login', (req, res) => {
  const username = sanitizeInput(req.body.username);
  const password = req.body.password;
  
  if (!isValidUsername(username) || !password) {
    return res.status(400).json({ error: 'Invalid credentials format' });
  }
  
  // Use parameterized query
  const query = 'SELECT id, username, password_hash FROM users WHERE username = ?';
  connection.query(query, [username], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    
    if (results.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    
    // In production, use bcrypt to compare password hashes
    const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
    
    if (results[0].password_hash === passwordHash) {
      res.json({ success: true, message: 'Login successful' });
    } else {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
  });
});

// FIX 4: Prevent Command Injection with input validation and safe alternatives
app.get('/ping', (req, res) => {
  const host = sanitizeInput(req.query.host);
  
  // Validate hostname
  if (!isValidHostname(host)) {
    return res.status(400).json({ error: 'Invalid host format' });
  }
  
  // Use array form of exec to prevent command injection
  // Also limit the command to prevent abuse
  const isWindows = process.platform === 'win32';
  const pingCmd = isWindows ? 'ping' : 'ping';
  const args = isWindows ? ['-n', '4', host] : ['-c', '4', host];
  
  // Use execFile instead of exec for better security
  const { execFile } = require('child_process');
  execFile(pingCmd, args, { timeout: 10000 }, (err, stdout, stderr) => {
    if (err) {
      return res.status(500).json({ error: 'Ping failed' });
    }
    res.json({ output: stdout });
  });
});

// FIX 5: Prevent Path Traversal with proper validation
app.get('/download', (req, res) => {
  const filename = sanitizeInput(req.query.file);
  
  // Validate filename
  if (!isValidFilename(filename)) {
    return res.status(400).json({ error: 'Invalid filename' });
  }
  
  // Use path.resolve and path.join to prevent traversal
  const uploadsDir = path.resolve(__dirname, 'uploads');
  const filePath = path.resolve(uploadsDir, filename);
  
  // Ensure the resolved path is still within uploads directory
  if (!filePath.startsWith(uploadsDir)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  // Check if file exists before attempting download
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }
  
  res.download(filePath, (err) => {
    if (err) {
      console.error('Download error:', err);
      res.status(500).json({ error: 'Download failed' });
    }
  });
});

// FIX 6: Proper Input Validation for file uploads
app.post('/upload', (req, res) => {
  const filename = sanitizeInput(req.body.filename);
  const content = req.body.content;
  
  // Validate filename
  if (!isValidFilename(filename)) {
    return res.status(400).json({ error: 'Invalid filename format' });
  }
  
  // Validate content
  if (!content || typeof content !== 'string') {
    return res.status(400).json({ error: 'Invalid content' });
  }
  
  // Limit content size
  if (content.length > 1024 * 1024) { // 1MB limit
    return res.status(400).json({ error: 'Content too large' });
  }
  
  const uploadsDir = path.resolve(__dirname, 'uploads');
  const filePath = path.resolve(uploadsDir, filename);
  
  // Ensure the resolved path is still within uploads directory
  if (!filePath.startsWith(uploadsDir)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  // Create uploads directory if it doesn't exist
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  
  try {
    fs.writeFileSync(filePath, content, { flag: 'w', mode: 0o644 });
    res.json({ message: 'File uploaded successfully' });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// FIX 7: Remove sensitive information disclosure
app.get('/debug', (req, res) => {
  // Only expose minimal, non-sensitive information
  // In production, this endpoint should be removed or protected with authentication
  if (process.env.NODE_ENV !== 'production') {
    res.json({
      nodeVersion: process.version,
      platform: process.platform
    });
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Secure server running on port ${PORT}`));
