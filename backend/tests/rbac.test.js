const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { app } = require('../src/server');

test('RBAC & Security Authorization Enforcement', async (t) => {
  await t.test('should reject unauthenticated requests to protected endpoints with 401 Unauthorized', async () => {
    const res = await request(app).get('/api/students');
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.error.code, 'UNAUTHORIZED');
  });

  await t.test('should reject requests with invalid authorization tokens with 401 Unauthorized', async () => {
    const res = await request(app)
      .get('/api/students')
      .set('Authorization', 'Bearer invalid-token-string');
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.success, false);
  });
});
