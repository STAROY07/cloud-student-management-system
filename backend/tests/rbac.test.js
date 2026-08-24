const test = require('node:test');
const assert = require('node:assert');

test('RBAC & Security Authorization Enforcement', async (t) => {
  const baseUrl = `http://localhost:8080`;

  await t.test('should reject unauthenticated requests to protected endpoints with 401 Unauthorized', async () => {
    const res = await fetch(`${baseUrl}/api/students`);
    assert.strictEqual(res.status, 401);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.error.code, 'UNAUTHORIZED');
  });

  await t.test('should reject requests with invalid authorization tokens with 401 Unauthorized', async () => {
    const res = await fetch(`${baseUrl}/api/students`, {
      headers: { Authorization: 'Bearer invalid-token-string' },
    });
    assert.strictEqual(res.status, 401);
    const body = await res.json();
    assert.strictEqual(body.success, false);
  });
});
