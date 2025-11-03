const request = require('supertest');
const { createInsecureApp } = require('../src/insecureApp');
const { createSecureApp } = require('../src/secureApp');

function buildInsecureStub() {
  const queries = [];
  return {
    connection: {
      query: (sql, callback) => {
        queries.push(sql);
        callback(null, [{ username: 'admin' }]);
      }
    },
    queries
  };
}

function buildSecureStub() {
  const statements = [];
  return {
    connection: {
      execute: async (sql, params) => {
        statements.push({ sql, params });
        return [[{ username: 'admin' }], undefined];
      }
    },
    statements
  };
}

describe('Security regression tests', () => {
  test('insecure app concatenates user input allowing SQL injection', async () => {
    const stub = buildInsecureStub();
    const app = createInsecureApp(stub.connection);

    const payload = { username: "admin' OR '1'='1" };
    await request(app).get('/user').query(payload).expect(200);

    expect(stub.queries).toHaveLength(1);
    expect(stub.queries[0]).toContain(payload.username);
    expect(stub.queries[0]).toMatch(/OR '1'='1/);
  });

  test('secure app uses parameterized queries and accepts benign input', async () => {
    const stub = buildSecureStub();
    const app = createSecureApp(stub.connection);

    const payload = { username: 'friendly_user' };
    const response = await request(app).get('/user').query(payload).expect(200);

    expect(response.body).toHaveLength(1);
    expect(stub.statements).toHaveLength(1);
    expect(stub.statements[0].sql).toMatch(/username = \?/);
    expect(stub.statements[0].params).toEqual(['friendly_user']);
  });

  test('secure app rejects malicious payload with meta characters', async () => {
    const stub = buildSecureStub();
    const app = createSecureApp(stub.connection);

    const payload = { username: "normal_user; DROP TABLE users;--" };
    const response = await request(app).get('/user').query(payload).expect(400);

    expect(response.body).toMatchObject({ error: 'validation_error' });
    expect(stub.statements).toHaveLength(0);
  });
});
