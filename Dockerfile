# Node.js Security Audit Environment

FROM node:18-alpine

# Install necessary tools
RUN apk add --no-cache \
    bash \
    curl \
    git \
    mysql-client

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application files
COPY . .

# Create uploads directory
RUN mkdir -p uploads && chmod 755 uploads

# Create .env file with secure defaults
RUN echo "DB_HOST=db" > .env && \
    echo "DB_USER=appuser" >> .env && \
    echo "DB_PASSWORD=secure_password_here" >> .env && \
    echo "DB_NAME=users" >> .env && \
    echo "NODE_ENV=development" >> .env && \
    echo "PORT=3000" >> .env

# Expose ports
EXPOSE 3000 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Default command
CMD ["node", "vulnerable-app.js"]
