-- Node.js Security Audit - Database Initialization Script
-- This script creates the necessary database and tables for testing

-- Create database
CREATE DATABASE IF NOT EXISTS users;
USE users;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100),
  password_hash VARCHAR(64),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert sample data
-- Password hash is SHA256 of 'password123'
INSERT IGNORE INTO users (username, email, password_hash) VALUES
('admin', 'admin@example.com', '9b8769a4a742959a2d0298c36fb70623f2dfacda8436237df08d8dfd5b37374c'),
('john_doe', 'john@example.com', '9b8769a4a742959a2d0298c36fb70623f2dfacda8436237df08d8dfd5b37374c'),
('jane_smith', 'jane@example.com', '9b8769a4a742959a2d0298c36fb70623f2dfacda8436237df08d8dfd5b37374c'),
('alice', 'alice@example.com', '9b8769a4a742959a2d0298c36fb70623f2dfacda8436237df08d8dfd5b37374c'),
('bob', 'bob@example.com', '9b8769a4a742959a2d0298c36fb70623f2dfacda8436237df08d8dfd5b37374c');

-- Create application user (for secure version)
-- Note: This requires root privileges
CREATE USER IF NOT EXISTS 'appuser'@'%' IDENTIFIED BY 'secure_password_here';
GRANT SELECT, INSERT, UPDATE, DELETE ON users.* TO 'appuser'@'%';
FLUSH PRIVILEGES;

-- Display success message
SELECT 'Database initialization complete!' as Status;
SELECT COUNT(*) as UserCount FROM users;
