import type { ActionContract, RoleGateContract } from '@giga/shared/types/contracts/integration-contract.types';

const roleGates: RoleGateContract[] = [
  { actor: 'User', canInvoke: true, constraints: ['User flows can emit scoped lifecycle logs through composed runtime handlers.'] },
  { actor: 'Root User', canInvoke: true, constraints: ['Root flows can emit logs with elevated scope metadata.'] },
  { actor: 'Super Admin', canInvoke: true, constraints: ['Super-admin flows can emit cross-organization lifecycle logs under policy checks.'] },
];

const sources = ['packages/apps/logger/src/lib/logger.ts', 'packages/apps/logger/src/lifecycle-jsonl.ts'];

const action = (
  actionName: string,
  mutating: boolean,
  description: string,
  inputSchema: Record<string, string>,
  outputSchema: Record<string, string>,
): ActionContract => ({
  packageName: '@connectingmatrix/logger',
  actionName,
  group: 'logger',
  source: 'logger',
  mutating,
  description,
  inputSchema,
  outputSchema,
  combinations: [
    {
      name: 'default',
      required: Object.keys(inputSchema).slice(0, 1),
      optional: Object.keys(inputSchema).slice(1),
      constraints: ['Structured metadata must be sanitized before persistence.'],
    },
  ],
  roleGates,
  sourcePaths: sources,
  notes: ['Lifecycle logging is consumed by backend runtime and monitoring integration flows.'],
});

export const ACTION_CONTRACTS: ActionContract[] = [
  action(
    'getScopedLogger',
    false,
    'Creates scoped logger child instance for a runtime boundary.',
    { scope: 'string' },
    { logger: 'scoped logger object' },
  ),
  action('toErrorMeta', false, 'Sanitizes nested errors and sensitive metadata keys before logging.', { error: 'unknown' }, { meta: 'record' }),
  action(
    'createLifecycleState',
    false,
    'Creates lifecycle state with request id and start timestamps.',
    { requestId: 'string' },
    { state: 'request state object' },
  ),
  action(
    'markLifecycle',
    true,
    'Emits lifecycle start/progress/end/error log events with duration metadata.',
    { state: 'record', layer: 'string', event: 'string', phase: 'start|progress|end|error', transport: 'string' },
    { state: 'record', entry: 'record' },
  ),
];

export const NO_ACTION_SURFACE_REASON = '';
