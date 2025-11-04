process.env.NODE_ENV = 'test';

const fs = require('fs');
const path = require('path');
const { expect } = require('chai');
const supertest = require('supertest');
const { createApp } = require('../src/app');
const { source_code: insecureSource } = require('../input.json');

const userServiceSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'userService.js'), 'utf8');
const envExample = fs.readFileSync(path.join(__dirname, '..', '.env.example'), 'utf8');

function buildTestApp(mockRows = []) {
  const userService = {
    async findByUsername(username) {
      return mockRows.filter((row) => row.username === username);
    }
  };
  return createApp({ userService });
}

describe('Baseline vulnerability detection', () => {
  it('detects SQL injection risk in the legacy implementation', () => {
    expect(insecureSource).to.include("SELECT * FROM users WHERE username = '${username}'");
  });

  it('detects hardcoded database password in the legacy implementation', () => {
    expect(insecureSource).to.include("password: 'password123'");
  });
});

describe('Hardened service regression tests', () => {
  it('uses parameterized queries instead of string concatenation', () => {
    expect(userServiceSource).to.include('WHERE username = ?');
    expect(userServiceSource).to.not.include("username = '${");
  });

  it('requires credentials to come from the environment', () => {
    expect(envExample).to.include('DB_PASSWORD');
    expect(userServiceSource).to.not.include('password123');
  });

  it('rejects SQL injection payloads via validation', async () => {
    const app = buildTestApp([{ id: 1, username: 'admin', email: 'admin@example.com' }]);
    const request = supertest(app);
    const response = await request.get('/user').query({ username: "admin' OR '1'='1" });
    expect(response.status).to.equal(400);
    expect(response.body).to.have.property('error');
  });

  it('returns data for legitimate users', async () => {
    const app = buildTestApp([
      { id: 1, username: 'admin', email: 'admin@example.com' },
      { id: 2, username: 'alice', email: 'alice@example.com' }
    ]);
    const request = supertest(app);
    const response = await request.get('/user').query({ username: 'alice' });
    expect(response.status).to.equal(200);
    expect(response.body).to.deep.equal([
      { id: 2, username: 'alice', email: 'alice@example.com' }
    ]);
  });

  it('does not leak internal error details', async () => {
    const faultyService = {
      async findByUsername() {
        throw new Error('Simulated database failure');
      }
    };
    const app = createApp({ userService: faultyService });
    const response = await supertest(app).get('/user').query({ username: 'admin' });
    expect(response.status).to.equal(500);
    expect(response.body).to.deep.equal({ error: 'Internal server error' });
  });
});
