const test = require('node:test');
const assert = require('node:assert');
const { hashPassword, comparePassword } = require('../src/utils/password');
const { generateToken, verifyToken } = require('../src/utils/jwt');

test('Security & Authentication Unit Tests', async (t) => {
  await t.test('should securely hash plaintext password with salt and verify match', async () => {
    const plain = 'TestPassword@123';
    const hash = await hashPassword(plain);

    assert.ok(hash, 'Hash should be defined');
    assert.notStrictEqual(hash, plain, 'Hash must not equal plaintext');
    assert.ok(hash.startsWith('$2'), 'Hash should start with bcrypt identifier $2');

    const isMatch = await comparePassword(plain, hash);
    assert.strictEqual(isMatch, true, 'Valid password must match hash');

    const isWrongMatch = await comparePassword('WrongPassword', hash);
    assert.strictEqual(isWrongMatch, false, 'Invalid password must not match hash');
  });

  await t.test('should generate and verify valid JWT token payload', () => {
    const payload = {
      userId: '123e4567-e89b-12d3-a456-426614174000',
      email: 'test@university.edu',
      role: 'ADMIN',
    };

    const token = generateToken(payload);
    assert.strictEqual(typeof token, 'string', 'Token should be a string');
    assert.strictEqual(token.split('.').length, 3, 'JWT should contain 3 dot-separated segments');

    const decoded = verifyToken(token);
    assert.strictEqual(decoded.userId, payload.userId);
    assert.strictEqual(decoded.email, payload.email);
    assert.strictEqual(decoded.role, payload.role);
  });

  await t.test('should reject invalid or tampered tokens', () => {
    assert.throws(() => {
      verifyToken('invalid.token.payload');
    });
  });
});
