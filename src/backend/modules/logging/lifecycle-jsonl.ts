import { lifecycleLogger } from '@connectingmatrix/logger/lib/logger';

const nowMs = () => Date.now();

export const createLifecycleState = (requestId: string) => ({ requestId, startedAtMs: nowMs(), lastAtMs: nowMs() });

export const logger = lifecycleLogger;

export const markLifecycle = (
  state: { requestId: string; startedAtMs: number; lastAtMs: number },
  input: {
    layer: string;
    event: string;
    phase: 'start' | 'progress' | 'end' | 'error';
    transport: string;
    status?: string;
    runId?: string | null;
    meta?: Record<string, unknown>;
  },
) => {
  const atMs = nowMs();
  const durationMs = atMs - state.startedAtMs;
  const sincePrevMs = atMs - state.lastAtMs;
  state.lastAtMs = atMs;
  const entry = {
    layer: input.layer,
    event: input.event,
    phase: input.phase,
    status: input.status || null,
    run_id: input.runId || null,
    request_id: state.requestId,
    transport: input.transport,
    duration_ms: durationMs,
    since_prev_ms: sincePrevMs,
    meta: input.meta || {},
  };
  if (input.phase === 'error' || input.status === 'failed') {
    logger.error('lifecycle.error', entry);
    return;
  }
  if (input.phase === 'progress') {
    logger.debug('lifecycle.debug', entry);
    return;
  }
  logger.info('lifecycle.info', entry);
};
