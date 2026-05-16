import { readStoredTokens } from '@giga/dataloader/client/legacy/graphql/helper';
import { readRuntimeMonitor as readRuntimeMonitorOperation } from '@giga/dataloader/client/legacy/orm/runtime-monitor';
import { RuntimeMonitorSocketClient } from '@giga/dataloader/client/legacy/socket/runtime/RuntimeMonitorSocketClient';
import type { RuntimeEventPayload, RuntimeMonitorPayload, RuntimeSubscribeInput } from '@giga/dataloader/client/legacy/socket/runtime/types.socket';
import type { EntityRecord, RuntimeLog, RuntimeMonitorState, RuntimeProcess, ScopeRef } from '@giga/dataloader/client/legacy/orm';
import type { UiDataContext } from '@giga/dataloader/client/legacy/dataloaders/context';
import type { UiPermissionSnapshot } from '@giga/dataloader/client/legacy/dataloaders/permissions-ui.loader';

export type RuntimeMonitorKind = 'processes' | 'workflows' | 'agents' | 'swarms' | 'applications';
export type { RuntimeEventPayload };
export type RuntimeStatus = 'running' | 'sleeping' | 'high-cpu' | 'stopped' | 'zombie' | 'active' | 'queued' | 'failed';
export type RuntimeLogLevel = 'INFO' | 'DEBUG' | 'WARN' | 'ERROR';
type RuntimeMode = 'root' | 'orgAdmin' | 'user';

export interface RuntimeMetric {
    label: string;
    value: string;
    tone: 'blue' | 'green' | 'purple' | 'red' | 'cyan';
    sparkline: { points: number[] };
}
export interface RuntimeUserRow {
    id: string;
    name: string;
    cpu: string;
    memory: string;
    processes: number;
    status: RuntimeStatus;
}
export interface RuntimeProcessRow {
    id: string;
    parentId: string | null;
    userId?: string | null;
    name: string;
    icon: string;
    pid: string;
    cpu: string;
    memory: string;
    status: RuntimeStatus;
    depth: number;
}
export interface RuntimeLogRow {
    id: string;
    time: string;
    process: string;
    pid: string;
    level: RuntimeLogLevel;
    message: string;
}

export interface RuntimeMonitorEventLog {
    id: string;
    timestamp: string;
    processName: string;
    processId?: string;
    parentId?: string;
    pid?: number;
    level: RuntimeLogLevel;
    message: string;
    processStatus?: RuntimeStatus;
    kind?: RuntimeEventPayload['kind'];
}
export interface RuntimeMonitorModel {
    mode: RuntimeMode;
    kind: RuntimeMonitorKind;
    scopeLabel: string;
    metrics: RuntimeMetric[];
    users: RuntimeUserRow[];
    processes: RuntimeProcessRow[];
    logs: RuntimeLogRow[];
    updatedAt: string;
    uptime: string;
}

const monitorInput = (permissions: UiPermissionSnapshot, kind: RuntimeMonitorKind, organizationId: string | null): RuntimeSubscribeInput => ({
    requestId: crypto.randomUUID(),
    kind,
    first: 25,
    offset: 0,
    organizationId: permissions.role === 'orgAdmin' || organizationId ? organizationId : null
});

const runtimeProcess = (row: RuntimeProcessRow): RuntimeProcess => ({
    id: row.id,
    kind: row.id.startsWith('workflow:') ? 'workflow' : row.id.startsWith('agent-') ? 'agent' : row.id.startsWith('swarm') ? 'swarm' : 'application',
    name: row.name,
    owner: row.pid,
    status: row.status,
    progress: row.status === 'failed' || row.status === 'stopped' ? 0 : 100,
    startedAt: row.pid,
    scopeTitle: row.parentId || 'Runtime',
});

const runtimeLog = (row: RuntimeLogRow): RuntimeLog => ({
    id: row.id,
    level: row.level === 'ERROR' ? 'error' : row.level === 'WARN' ? 'warning' : 'info',
    message: row.message,
    createdAt: row.time,
});

const executorKindFromEvent = (kind: RuntimeEventPayload['kind']) => (kind === 'agent.run' ? 'agent' : kind === 'workflow.run' ? 'workflow' : 'swarm');

const normalizeStatus = (value?: string) => (value ? value.toLowerCase().trim() : '');
const eventTarget = (event: RuntimeEventPayload): string => {
    if (event.workerId) return `swarm:${event.workerId}`;
    if (event.agentId) return `agent:${event.agentId}`;
    if (event.workflowId) return `workflow:${event.workflowId}`;
    if (event.swarmId) return `swarm:${event.swarmId}`;
    if (event.runId) return `run:${event.runId}`;
    return 'runtime:unknown';
};

const eventGroup = (event: RuntimeEventPayload): string => {
    if (event.kind === 'agent.run') return 'process-group:agents';
    if (event.kind === 'workflow.run') return 'process-group:workflows';
    if (event.kind === 'swarm.worker') return 'process-group:agents';
    return 'system';
};

const eventStarted = (status: string) => status === 'started' || status === 'accepted' || status === 'start' || status === 'running';
const eventCompleted = (status: string) => status === 'completed' || status === 'finished' || status === 'succeeded' || status === 'done' || status === 'stopped';
const eventFailed = (status: string) => status === 'failed' || status === 'error' || status === 'errored';
const eventQueued = (status: string) => status === 'queued' || status === 'pending' || status === 'planned';
const eventRuntimeStatus = (status: string): RuntimeStatus => {
    if (eventStarted(status) || eventQueued(status)) return 'running';
    if (eventCompleted(status)) return 'stopped';
    if (eventFailed(status)) return 'failed';
    return 'active';
};

export const runtimeEventToProcessLog = (event: RuntimeEventPayload): RuntimeMonitorEventLog => {
    const status = normalizeStatus(event.status);
    const processId = eventTarget(event);
    const level = eventFailed(status) ? 'ERROR' : eventQueued(status) ? 'WARN' : eventStarted(status) || eventCompleted(status) ? 'INFO' : 'DEBUG';
    const targetLabel = processId.replace(':', ' ');
    const scope = event.kind === 'agent.run' || event.kind === 'workflow.run' || event.kind === 'swarm.worker' ? executorKindFromEvent(event.kind) : 'executor';
    const kindLabel = `${scope} ${targetLabel}`;
    let message = event.message || '';
    if (!message) {
        if (eventStarted(status)) message = `${kindLabel} started`;
        else if (eventCompleted(status)) message = `${kindLabel} completed`;
        else if (eventFailed(status)) message = `${kindLabel} failed`;
        else if (eventQueued(status)) message = `${kindLabel} queued`;
        else message = `${kindLabel} ${status || 'updated'}`;
    }
    const processName = `${scope} ${targetLabel}`;
    const pid = typeof event.pid === 'number' ? event.pid : undefined;

    return {
        id: `runtime-event:${event.timestamp}:${event.kind}:${processId}`,
        timestamp: event.timestamp,
        processName,
        kind: event.kind,
        processId,
        parentId: eventGroup(event),
        processStatus: eventRuntimeStatus(status),
        pid,
        level,
        message
    };
};

const userRecord = (row: RuntimeUserRow): EntityRecord => ({
    id: row.id,
    entity: 'User',
    title: row.name,
    subtitle: `${row.cpu} CPU / ${row.memory} memory`,
    slug: row.id,
    status: row.status,
    createdAt: '',
    updatedAt: '',
    data: { processes: row.processes },
});

export const loadRuntimeMonitor = async (permissions: UiPermissionSnapshot, kind: RuntimeMonitorKind, organizationId: string | null): Promise<RuntimeMonitorModel> => {
    return monitorFromPayload(await readRuntimeMonitorOperation(monitorInput(permissions, kind, organizationId)));
};

export const loadRuntimeMonitorState = async (context: UiDataContext, scope: ScopeRef): Promise<RuntimeMonitorState> => {
    const monitor = await loadRuntimeMonitor({ role: context.policy.role === 'org-admin' ? 'orgAdmin' : context.policy.role, permissions: context.policy.permissions }, 'processes', scope.kind === 'organization' ? scope.id : null);
    return { policy: { ...context.policy, scope }, processes: monitor.processes.map(runtimeProcess), logs: monitor.logs.map(runtimeLog), users: monitor.users.map(userRecord) };
};

export const subscribeRuntimeMonitor = (
    permissions: UiPermissionSnapshot,
    kind: RuntimeMonitorKind,
    organizationId: string | null,
    onSnapshot: (monitor: RuntimeMonitorModel) => void,
    onError: (error: Error) => void,
    onEvent?: (event: RuntimeMonitorEventLog) => void
): (() => void) => {
    const tokens = readStoredTokens();
    if (!tokens?.accessToken) throw new Error('Runtime monitor subscription requires an authenticated session.');
    const input = monitorInput(permissions, kind, organizationId);
    void readRuntimeMonitorOperation(input).then((payload) => onSnapshot(monitorFromPayload(payload)), onError);
    const client = new RuntimeMonitorSocketClient(tokens.accessToken);
    return client.subscribe(input, {
        onSnapshot: (monitor: RuntimeMonitorPayload) => onSnapshot(monitorFromPayload(monitor)),
        onEvent: onEvent
            ? (event) => onEvent(runtimeEventToProcessLog(event))
            : undefined,
        onError: (message) => onError(new Error(message))
    });
};

const monitorFromPayload = (monitor: RuntimeMonitorPayload): RuntimeMonitorModel => ({
    ...monitor,
    metrics: monitor.metrics.map((metric) => ({ ...metric, sparkline: { points: metric.points } })),
});
