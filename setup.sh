#!/bin/bash

# Node.js Security Audit - Setup Script
# This script sets up the complete testing environment

set -e

echo "========================================="
echo "Node.js Security Audit - Environment Setup"
echo "========================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed"
    echo "Please install Node.js 14+ from https://nodejs.org/"
    exit 1
fi

echo "✓ Node.js version: $(node --version)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "Error: npm is not installed"
    exit 1
fi

echo "✓ npm version: $(npm --version)"

# Install dependencies
echo ""
echo "Installing dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo "✓ Dependencies installed successfully"
else
    echo "✗ Failed to install dependencies"
    exit 1
fi

# Create necessary directories
echo ""
echo "Creating directories..."
mkdir -p uploads
mkdir -p results
mkdir -p logs

echo "✓ Directories created"

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo ""
    echo "Creating .env file..."
    cat > .env << EOF
# Database Configuration
DB_HOST=localhost
DB_USER=appuser
DB_PASSWORD=secure_password_$(openssl rand -hex 8)
DB_NAME=users

# Application Configuration
NODE_ENV=development
PORT=3000

# Security Settings
SESSION_SECRET=$(openssl rand -hex 32)
EOF
    echo "✓ .env file created with secure defaults"
else
    echo "✓ .env file already exists"
fi

# Create database initialization script
echo ""
echo "Creating database setup script..."
cat > setup-database.js << 'EOF'
const mysql = require('mysql');
const crypto = require('crypto');

const connection = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: 'root',
  password: process.env.DB_ROOT_PASSWORD || 'rootpass123'
});

connection.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
    process.exit(1);
  }
  
  console.log('Connected to MySQL');
  
  // Create database
  connection.query('CREATE DATABASE IF NOT EXISTS users', (err) => {
    if (err) {
      console.error('Error creating database:', err);
      process.exit(1);
    }
    console.log('✓ Database created');
    
    // Use database
    connection.query('USE users', (err) => {
      if (err) {
        console.error('Error selecting database:', err);
        process.exit(1);
      }
      
      // Create users table
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          username VARCHAR(50) UNIQUE NOT NULL,
          email VARCHAR(100),
          password_hash VARCHAR(64),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;
      
      connection.query(createTableQuery, (err) => {
        if (err) {
          console.error('Error creating table:', err);
          process.exit(1);
        }
        console.log('✓ Users table created');
        
        // Insert sample data
        const passwordHash = crypto.createHash('sha256').update('password123').digest('hex');
        const insertQuery = `
          INSERT IGNORE INTO users (username, email, password_hash) VALUES
          ('admin', 'admin@example.com', '${passwordHash}'),
          ('john_doe', 'john@example.com', '${passwordHash}'),
          ('jane_smith', 'jane@example.com', '${passwordHash}')
        `;
        
        connection.query(insertQuery, (err) => {
          if (err) {
            console.error('Error inserting data:', err);
            process.exit(1);
          }
          console.log('✓ Sample data inserted');
          console.log('\nDatabase setup complete!');
          connection.end();
        });
      });
    });
  });
});
EOF

echo "✓ Database setup script created"

# Create init-db.sql for Docker
cat > init-db.sql << 'EOF'
CREATE DATABASE IF NOT EXISTS users;
USE users;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100),
  password_hash VARCHAR(64),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT IGNORE INTO users (username, email, password_hash) VALUES
('admin', 'admin@example.com', '9b8769a4a742959a2d0298c36fb70623f2dfacda8436237df08d8dfd5b37374c'),
('john_doe', 'john@example.com', '9b8769a4a742959a2d0298c36fb70623f2dfacda8436237df08d8dfd5b37374c'),
('jane_smith', 'jane@example.com', '9b8769a4a742959a2d0298c36fb70623f2dfacda8436237df08d8dfd5b37374c');
EOF

echo "✓ Database initialization SQL created"

echo ""
echo "========================================="
echo "Setup Complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Set up MySQL database (if not using Docker):"
echo "   node setup-database.js"
echo ""
echo "2. Run the vulnerable application:"
echo "   npm run start:vulnerable"
echo ""
echo "3. Run security tests:"
echo "   npm run test:vulnerable"
echo ""
echo "4. Or use Docker:"
echo "   docker-compose up -d"
echo ""
echo "For more information, see README.md"
echo ""
