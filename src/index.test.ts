import test from 'node:test';
import assert from 'node:assert/strict';
import { Logger, processMonitoring } from './index.js';

test('logs event', async () => {
  const event = await Logger.info('hello');
  assert.equal(event.message, 'hello');
  assert.equal(event.level, 'info');
});

test('processMonitoring list/live/logs.live/abort works', async () => {
  let liveCount = 0;
  const off = processMonitoring.live((rows) => { liveCount = Array.isArray(rows) ? rows.length : 1; });
  const row = processMonitoring.track('workflow-exec:test', { label: 'Workflow test', status: 'running', context: { processKind: 'Workflows' } });
  assert.equal(row.kind, 'Workflows');
  assert.equal(processMonitoring.list({ kind: 'Workflows' }).length >= 1, true);
  const logs = processMonitoring.logs.live('workflow-exec:test');
  assert.equal(Array.isArray(logs), true);
  const aborted = await processMonitoring.abort('workflow-exec:test', 'unit test abort');
  assert.equal(aborted.status, 'aborted');
  assert.equal(liveCount >= 1, true);
  if (typeof off === 'function') off();
});
