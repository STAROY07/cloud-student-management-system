const test = require('node:test');
const assert = require('node:assert');
const config = require('../src/config/env');
const localStore = require('../src/config/localStore');
const { generateToken } = require('../src/utils/jwt');
const { recordAuditLog } = require('../src/middleware/audit.middleware');
const { authenticateToken } = require('../src/middleware/auth.middleware');
const { authorizeRoles } = require('../src/middleware/rbac.middleware');
const { validate } = require('../src/middleware/validate.middleware');
const { errorHandler, notFoundHandler } = require('../src/middleware/error.middleware');
const { loginSchema } = require('../src/validators/auth.validator');

const createResponse = () => ({
  statusCode: null,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});

test('Request middleware', async (t) => {
  await t.test('validate normalizes valid input and reports Zod errors', async () => {
    const validReq = {
      body: { email: 'STUDENT@university.edu', password: 'secret123' },
    };
    const validRes = createResponse();
    let nextCalls = 0;
    await validate(loginSchema)(validReq, validRes, () => {
      nextCalls += 1;
    });
    assert.strictEqual(nextCalls, 1);
    assert.strictEqual(validReq.body.email, 'STUDENT@university.edu');

    const invalidReq = { body: { email: 'invalid', password: '123' } };
    const invalidRes = createResponse();
    await validate(loginSchema)(invalidReq, invalidRes, () => {
      nextCalls += 1;
    });
    assert.strictEqual(invalidRes.statusCode, 400);
    assert.strictEqual(invalidRes.body.error.code, 'VALIDATION_ERROR');
    assert.deepStrictEqual(
      invalidRes.body.error.details.map(({ field }) => field),
      ['email', 'password']
    );
    assert.strictEqual(nextCalls, 1);
  });

  await t.test('validate forwards unexpected parsing errors', async () => {
    const expectedError = new Error('parse failed');
    const schema = {
      body: {
        parseAsync: async () => {
          throw expectedError;
        },
      },
    };
    let forwardedError;
    await validate(schema)({ body: {} }, createResponse(), (error) => {
      forwardedError = error;
    });
    assert.strictEqual(forwardedError, expectedError);
  });

  await t.test('validate parses query and route parameters', async () => {
    const req = {
      query: { page: '2' },
      params: { id: 'exam-1' },
    };
    const schema = {
      query: {
        parseAsync: async ({ page }) => ({ page: Number(page) }),
      },
      params: {
        parseAsync: async (params) => params,
      },
    };
    let nextCalls = 0;
    await validate(schema)(req, createResponse(), () => {
      nextCalls += 1;
    });
    assert.deepStrictEqual(req.query, { page: 2 });
    assert.deepStrictEqual(req.params, { id: 'exam-1' });
    assert.strictEqual(nextCalls, 1);
  });

  await t.test('authorizeRoles enforces authentication and role membership', () => {
    const unauthenticatedRes = createResponse();
    authorizeRoles('ADMIN')({}, unauthenticatedRes, () => assert.fail('next should not run'));
    assert.strictEqual(unauthenticatedRes.statusCode, 401);
    assert.strictEqual(unauthenticatedRes.body.error.code, 'UNAUTHENTICATED');

    const forbiddenRes = createResponse();
    authorizeRoles('ADMIN')(
      {
        user: { id: 'student-1', role: 'STUDENT' },
        originalUrl: '/api/students',
        method: 'POST',
      },
      forbiddenRes,
      () => assert.fail('next should not run')
    );
    assert.strictEqual(forbiddenRes.statusCode, 403);
    assert.strictEqual(forbiddenRes.body.error.code, 'FORBIDDEN_ROLE_ACCESS');

    let authorized = false;
    authorizeRoles('ADMIN', 'FACULTY')(
      { user: { id: 'faculty-1', role: 'FACULTY' } },
      createResponse(),
      () => {
        authorized = true;
      }
    );
    assert.strictEqual(authorized, true);
  });

  await t.test('authenticateToken rejects missing and invalid credentials', async () => {
    const missingRes = createResponse();
    await authenticateToken({ headers: {} }, missingRes, () => assert.fail('next should not run'));
    assert.strictEqual(missingRes.statusCode, 401);
    assert.strictEqual(missingRes.body.error.code, 'UNAUTHORIZED');

    const invalidRes = createResponse();
    await authenticateToken(
      {
        headers: { authorization: 'Bearer invalid-token' },
        ip: '127.0.0.1',
      },
      invalidRes,
      () => assert.fail('next should not run')
    );
    assert.strictEqual(invalidRes.statusCode, 401);
    assert.strictEqual(invalidRes.body.error.code, 'TOKEN_INVALID');
  });

  await t.test('authenticateToken enriches active users and rejects unknown users', async () => {
    await localStore.init();
    const activeUser = localStore.users.find(({ role }) => role === 'STUDENT');
    const req = {
      headers: {
        authorization: `Bearer ${generateToken({ userId: activeUser.id })}`,
      },
    };
    let nextCalls = 0;
    await authenticateToken(req, createResponse(), () => {
      nextCalls += 1;
    });
    assert.strictEqual(nextCalls, 1);
    assert.strictEqual(req.user.id, activeUser.id);
    assert.strictEqual(req.user.studentId, localStore.students[0].id);
    assert.strictEqual(req.user.department, 'Computer Science');

    const unknownRes = createResponse();
    await authenticateToken(
      {
        headers: {
          authorization: `Bearer ${generateToken({ userId: 'missing-user' })}`,
        },
      },
      unknownRes,
      () => assert.fail('next should not run')
    );
    assert.strictEqual(unknownRes.statusCode, 401);
    assert.strictEqual(unknownRes.body.error.code, 'USER_NOT_FOUND');
  });

  await t.test('authenticateToken rejects suspended users', async () => {
    await localStore.init();
    const user = localStore.users.find(({ role }) => role === 'STUDENT');
    const originalStatus = user.status;
    user.status = 'SUSPENDED';

    try {
      const res = createResponse();
      await authenticateToken(
        {
          headers: {
            authorization: `Bearer ${generateToken({ userId: user.id })}`,
          },
        },
        res,
        () => assert.fail('next should not run')
      );
      assert.strictEqual(res.statusCode, 403);
      assert.strictEqual(res.body.error.code, 'ACCOUNT_SUSPENDED');
    } finally {
      user.status = originalStatus;
    }
  });

  await t.test('authenticateToken reports unexpected data-store failures safely', async () => {
    await localStore.init();
    const originalUsers = localStore.users;
    localStore.users = null;

    try {
      const res = createResponse();
      await authenticateToken(
        {
          headers: {
            authorization: `Bearer ${generateToken({ userId: 'user-1' })}`,
          },
        },
        res,
        () => assert.fail('next should not run')
      );
      assert.strictEqual(res.statusCode, 500);
      assert.strictEqual(res.body.error.code, 'AUTH_INTERNAL_ERROR');
    } finally {
      localStore.users = originalUsers;
    }
  });

  await t.test('recordAuditLog persists structured audit metadata', async () => {
    await localStore.init();
    const initialCount = localStore.auditLogs.length;
    await recordAuditLog({
      actorId: 'user-1',
      action: 'PROFILE_UPDATED',
      entity: 'USER',
      entityId: 42,
      details: { field: 'phone' },
      ipAddress: '127.0.0.1',
    });

    assert.strictEqual(localStore.auditLogs.length, initialCount + 1);
    assert.deepStrictEqual(
      {
        actorId: localStore.auditLogs[0].actor_id,
        action: localStore.auditLogs[0].action,
        entityId: localStore.auditLogs[0].entity_id,
        details: localStore.auditLogs[0].details,
      },
      {
        actorId: 'user-1',
        action: 'PROFILE_UPDATED',
        entityId: '42',
        details: { field: 'phone' },
      }
    );
  });

  await t.test('error handlers preserve safe response contracts', () => {
    const originalNodeEnv = config.nodeEnv;
    const error = Object.assign(new Error('invalid request'), {
      statusCode: 422,
      code: 'INVALID_REQUEST',
    });
    const req = {
      originalUrl: '/api/test',
      method: 'POST',
      ip: '127.0.0.1',
    };

    const developmentRes = createResponse();
    config.nodeEnv = 'development';
    errorHandler(error, req, developmentRes);
    assert.strictEqual(developmentRes.statusCode, 422);
    assert.strictEqual(developmentRes.body.error.message, 'invalid request');
    assert.ok(developmentRes.body.error.stack);

    const productionRes = createResponse();
    config.nodeEnv = 'production';
    errorHandler(new Error('database password leaked'), req, productionRes);
    assert.strictEqual(productionRes.statusCode, 500);
    assert.strictEqual(
      productionRes.body.error.message,
      'An unexpected error occurred on the server. Please try again later.'
    );
    assert.strictEqual('stack' in productionRes.body.error, false);

    config.nodeEnv = originalNodeEnv;

    const notFoundRes = createResponse();
    notFoundHandler({ method: 'GET', originalUrl: '/api/missing' }, notFoundRes);
    assert.strictEqual(notFoundRes.statusCode, 404);
    assert.strictEqual(notFoundRes.body.error.code, 'ROUTE_NOT_FOUND');
  });
});
