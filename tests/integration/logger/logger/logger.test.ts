import assert from 'node:assert/strict';
import test from 'node:test';
import { getScopedLogger, toErrorMeta } from '../../src/lib/logger';

test('toErrorMeta sanitizes nested sensitive fields', () => {
  const meta = toErrorMeta({
    message: 'failed',
    token: 'secret',
    nested: { authorization: 'Bearer abc', apiKey: 'x', ok: true },
  }) as Record<string, unknown>;
  const nested = meta.nested as Record<string, unknown>;
  assert.equal(meta.token, '[REDACTED]');
  assert.equal(nested.authorization, '[REDACTED]');
  assert.equal(nested.apiKey, '[REDACTED]');
  assert.equal(nested.ok, true);
});

test('scoped logger exposes standard logging methods', () => {
  const logger = getScopedLogger('unit-test');
  assert.equal(typeof logger.info, 'function');
  assert.equal(typeof logger.warn, 'function');
  assert.equal(typeof logger.error, 'function');
});
