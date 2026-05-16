import assert from 'node:assert/strict';
import test from 'node:test';
import { createLifecycleState, logger, markLifecycle } from '../../src/lifecycle-jsonl';

type LifecycleEntry = Record<string, string | number | null | Record<string, number>>;

test('createLifecycleState stores request id and start timestamps', () => {
  const originalNow = Date.now;
  Date.now = () => 1000;
  try {
    const state = createLifecycleState('request-1');
    assert.equal(state.requestId, 'request-1');
    assert.equal(state.startedAtMs, 1000);
    assert.equal(state.lastAtMs, 1000);
  } finally {
    Date.now = originalNow;
  }
});

test('markLifecycle routes info progress and error phases', () => {
  const infoEvents: LifecycleEntry[] = [];
  const debugEvents: LifecycleEntry[] = [];
  const errorEvents: LifecycleEntry[] = [];
  const originalNow = Date.now;
  const patchLogger = logger as {
    info: (message: string, entry: LifecycleEntry) => void;
    debug: (message: string, entry: LifecycleEntry) => void;
    error: (message: string, entry: LifecycleEntry) => void;
  };
  const originalInfo = patchLogger.info;
  const originalDebug = patchLogger.debug;
  const originalError = patchLogger.error;
  let now = 1000;
  Date.now = () => {
    now += 10;
    return now;
  };
  patchLogger.info = (_message: string, entry: LifecycleEntry) => infoEvents.push(entry);
  patchLogger.debug = (_message: string, entry: LifecycleEntry) => debugEvents.push(entry);
  patchLogger.error = (_message: string, entry: LifecycleEntry) => errorEvents.push(entry);
  try {
    const state = createLifecycleState('request-2');
    markLifecycle(state, { layer: 'chat', event: 'start', phase: 'start', transport: 'graphql' });
    markLifecycle(state, { layer: 'chat', event: 'stream', phase: 'progress', transport: 'graphql', meta: { pass: 1 } });
    markLifecycle(state, { layer: 'chat', event: 'failed', phase: 'error', transport: 'graphql', status: 'failed' });
    markLifecycle(state, { layer: 'chat', event: 'done', phase: 'end', transport: 'graphql', runId: 'run-1' });

    assert.equal(infoEvents.length, 2);
    assert.equal(debugEvents.length, 1);
    assert.equal(errorEvents.length, 1);
    assert.equal(infoEvents[0].status, null);
    assert.equal(infoEvents[0].run_id, null);
    assert.deepEqual(infoEvents[0].meta, {});
    assert.equal(infoEvents[1].run_id, 'run-1');
    assert.equal(debugEvents[0].event, 'stream');
    assert.equal(errorEvents[0].status, 'failed');
  } finally {
    patchLogger.info = originalInfo;
    patchLogger.debug = originalDebug;
    patchLogger.error = originalError;
    Date.now = originalNow;
  }
});
