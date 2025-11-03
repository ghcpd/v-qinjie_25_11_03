const request = require('supertest');

const mockExecute = jest.fn();
const mockOn = jest.fn();
const mockEnd = jest.fn();

jest.mock('mysql2/promise', () => {
  return {
    createPool: jest.fn(() => ({
      execute: mockExecute,
      on: mockOn,
      end: mockEnd
    }))
  };
});

const app = require('../src/app');
const { initPool, closePool } = require('../config/database');

describe('Security regression tests', () => {
  beforeEach(async () => {
    mockExecute.mockReset();
    mockOn.mockClear();
    mockEnd.mockClear();
    mockExecute.mockResolvedValueOnce([
      [
        {
          id: 1,
          username: 'admin',
          email: 'admin@example.com'
        }
      ],
      []
    ]);

    await initPool();
  });

  afterEach(async () => {
    await closePool();
  });

  test('returns user data using parameterized query', async () => {
    const username = 'admin';
    const response = await request(app).get('/user').query({ username });

    expect(response.statusCode).toBe(200);
    expect(response.body.results).toHaveLength(1);
    expect(mockExecute).toHaveBeenCalledTimes(1);
    const [sql, params] = mockExecute.mock.calls[0];
    expect(sql).toContain('username = ?');
    expect(params).toEqual([username]);
  });

  test('rejects SQL injection attempts with validation', async () => {
    const malicious = "admin' OR '1'='1";
    const response = await request(app).get('/user').query({ username: malicious });

    expect(response.statusCode).toBe(400);
    expect(response.body.error).toMatch(/Invalid username/);
    expect(mockExecute).not.toHaveBeenCalled();
  });

  test('requires username query parameter', async () => {
    const response = await request(app).get('/user');

    expect(response.statusCode).toBe(400);
    expect(response.body.error).toMatch(/required/);
    expect(mockExecute).not.toHaveBeenCalled();
  });
});
