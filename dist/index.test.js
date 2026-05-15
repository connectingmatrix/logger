import test from 'node:test';
import assert from 'node:assert/strict';
import { Logger } from './index.js';
test('logs event', async () => {
    const event = await Logger.info('hello');
    assert.equal(event.message, 'hello');
    assert.equal(event.level, 'info');
});
