const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { app } = require('../src/server');

test('REST API & Health Check Probes', async (t) => {
  await t.test('GET /api/health should return structured runtime status', async () => {
    const res = await request(app).get('/api/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.service, 'cloud-student-management-system');
    assert.strictEqual(res.body.status, 'HEALTHY');
    assert.ok(res.body.database, 'Should include database health metrics');
    assert.ok(res.body.runtime, 'Should include runtime telemetry');
  });

  await t.test('GET /api/non-existent-route should return 404 with structured error', async () => {
    const res = await request(app).get('/api/non-existent-route');
    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.error.code, 'ROUTE_NOT_FOUND');
  });
});
