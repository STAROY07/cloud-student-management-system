const test = require('node:test');
const assert = require('node:assert');
const config = require('../src/config/env');
const logger = require('../src/utils/logger');

test('Structured logger', async (t) => {
  const originalNodeEnv = config.nodeEnv;
  const originalLog = console.log;
  const output = [];
  console.log = (entry) => output.push(entry);

  t.after(() => {
    config.nodeEnv = originalNodeEnv;
    console.log = originalLog;
  });

  await t.test('redacts sensitive nested metadata in production JSON logs', () => {
    config.nodeEnv = 'production';
    logger.info('Profile updated', {
      userId: 'user-1',
      password: 'plain-text',
      nested: {
        authorizationHeader: 'Bearer secret',
        values: [{ token: 'jwt-value' }, { safe: 'visible' }],
      },
    });

    const entry = JSON.parse(output.at(-1));
    assert.strictEqual(entry.severity, 'INFO');
    assert.strictEqual(entry.password, '[REDACTED]');
    assert.strictEqual(entry.nested.authorizationHeader, '[REDACTED]');
    assert.strictEqual(entry.nested.values[0].token, '[REDACTED]');
    assert.strictEqual(entry.nested.values[1].safe, 'visible');
  });

  await t.test('formats development logs and suppresses production debug output', () => {
    config.nodeEnv = 'development';
    logger.warn('Access denied', { role: 'STUDENT' });
    assert.match(output.at(-1), /\[WARNING\].*Access denied.*STUDENT/);

    config.nodeEnv = 'production';
    const outputCount = output.length;
    logger.debug('hidden debug message');
    assert.strictEqual(output.length, outputCount);

    logger.critical('Service unavailable');
    assert.strictEqual(JSON.parse(output.at(-1)).severity, 'CRITICAL');
  });
});
