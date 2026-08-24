const test = require('node:test');
const assert = require('node:assert');

test('REST API & Health Check Probes', async (t) => {
  const baseUrl = `http://localhost:8080`;

  await t.test('GET /api/health should return structured runtime status', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.service, 'cloud-student-management-system');
    assert.strictEqual(body.status, 'HEALTHY');
    assert.ok(body.database, 'Should include database health metrics');
    assert.ok(body.runtime, 'Should include runtime telemetry');
  });

  await t.test('GET /api/non-existent-route should return 404 with structured error', async () => {
    const res = await fetch(`${baseUrl}/api/non-existent-route`);
    assert.strictEqual(res.status, 404);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.error.code, 'ROUTE_NOT_FOUND');
  });
});
