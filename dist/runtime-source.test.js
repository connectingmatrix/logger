import test from 'node:test';
import assert from 'node:assert/strict';
import { processMonitoring } from './index.js';
test('process monitoring binds live runtime sources and aborts process rows', async () => {
    processMonitoring.bindRuntimeSource({
        name: 'test-workflow-source',
        kind: 'workflow',
        list: () => [{ type: 'started', runId: 'run-1', workflowId: 'wf-1', message: 'running' }],
    }, { autoStart: false });
    await processMonitoring.startRuntimeSource('test-workflow-source');
    const rows = processMonitoring.queueStatus({ workflowId: 'wf-1' });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].status, 'running');
    await processMonitoring.abort(rows[0].processId, 'test abort');
    assert.equal(processMonitoring.queueStatus({ workflowId: 'wf-1' })[0].status, 'aborted');
});
