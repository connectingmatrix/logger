import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { LocalEventBus, makeId, nowIso } from './contracts.js';
import { PackageObservability } from './observability.js';
import { createStubLauncher } from './launcher.js';
const levelRank = { debug: 0, info: 1, warn: 2, error: 3 };
function memorySnapshot() {
    const proc = typeof process !== 'undefined' ? process : undefined;
    if (!proc?.memoryUsage)
        return undefined;
    const memory = proc.memoryUsage();
    return { rss: memory.rss, heapUsed: memory.heapUsed, heapTotal: memory.heapTotal, external: memory.external };
}
function cpuSnapshot() {
    const proc = typeof process !== 'undefined' ? process : undefined;
    if (!proc?.cpuUsage)
        return undefined;
    const cpu = proc.cpuUsage();
    return { userMicros: cpu.user, systemMicros: cpu.system };
}
function deriveKind(packageName, processId) {
    const key = `${packageName ?? ''}:${processId ?? ''}`.toLowerCase();
    if (key.includes('workflow'))
        return 'Workflows';
    if (key.includes('swarm'))
        return 'Swarm';
    if (key.includes('project'))
        return 'Projects';
    if (key.includes('node'))
        return 'Nodes';
    if (key.includes('chat'))
        return 'Chat';
    if (key.includes('agent'))
        return 'Ai Agents';
    if (key.includes('server'))
        return 'Server';
    return 'Other';
}
function normalizeProcessKind(kind, packageName, processId) {
    const raw = String(kind ?? deriveKind(packageName, processId)).toLowerCase().replace(/[_-]+/g, ' ').trim();
    if (raw.includes('workflow'))
        return 'Workflows';
    if (raw.includes('ai') && raw.includes('agent'))
        return 'Ai Agents';
    if (raw.includes('swarm'))
        return 'Swarm';
    if (raw.includes('project'))
        return 'Projects';
    if (raw.includes('node'))
        return 'Nodes';
    if (raw.includes('file'))
        return 'Files';
    if (raw.includes('drive'))
        return 'Drive';
    if (raw.includes('server'))
        return 'Server';
    return kind ?? deriveKind(packageName, processId);
}
function normalizeProcessStatus(status) {
    if (status === 'errored')
        return 'failed';
    if (['idle', 'queued', 'running', 'completed', 'failed', 'aborted'].includes(String(status)))
        return status;
    return 'running';
}
function runtimeEventProcessId(event) {
    return event.processId ?? event.runId ?? event.executionId ?? event.workflowId ?? event.projectId ?? event.agentId ?? event.swarmId ?? event.nodeId ?? makeId('runtime');
}
function runtimeEventKind(event) {
    const raw = String(event.kind ?? event.source ?? event.packageName ?? '').toLowerCase();
    if (event.workflowId || raw.includes('workflow'))
        return 'Workflows';
    if (event.projectId || raw.includes('project'))
        return 'Projects';
    if (event.swarmId || raw.includes('swarm'))
        return 'Swarm';
    if (event.nodeId || raw.includes('node'))
        return 'Nodes';
    if (event.agentId || raw.includes('agent'))
        return 'Ai Agents';
    return 'Other';
}
function runtimeEventPackage(event) {
    if (event.packageName)
        return event.packageName;
    const kind = runtimeEventKind(event);
    if (kind === 'Workflows')
        return '@connectingmatrix/workflows';
    if (kind === 'Projects')
        return '@connectingmatrix/projects';
    if (kind === 'Swarm')
        return '@connectingmatrix/agent-swarm';
    if (kind === 'Nodes')
        return '@connectingmatrix/nodes';
    if (kind === 'Ai Agents')
        return '@connectingmatrix/ai-agents';
    return '@connectingmatrix/logger';
}
function runtimeEventStatus(event) {
    const raw = String(event.status ?? event.type ?? '').toLowerCase();
    if (raw === 'queued')
        return 'queued';
    if (raw === 'started' || raw === 'running' || raw === 'heartbeat' || raw === 'log')
        return 'running';
    if (raw === 'completed' || raw === 'success' || raw === 'done' || raw === 'passed' || raw === 'deployed')
        return 'completed';
    if (raw === 'failed' || raw === 'error' || raw === 'errored')
        return 'failed';
    if (raw === 'aborted' || raw === 'cancelled' || raw === 'canceled')
        return 'aborted';
    return 'running';
}
class ProcessMonitoringRuntime {
    constructor() {
        this.bus = new LocalEventBus();
        this.logBus = new LocalEventBus();
        this.rows = new Map();
        this.processLogs = new Map();
        this.globalLogs = [];
        this.aborters = new Map();
        this.logs = {
            list: (processId, limit = 100) => {
                const max = Math.max(1, Math.min(1000, limit));
                if (!processId)
                    return this.globalLogs.slice(-max);
                return (this.processLogs.get(processId) ?? []).slice(-max);
            },
            live: (processId, handler) => {
                if (!handler)
                    return (this.processLogs.get(processId) ?? []).slice(-100);
                for (const event of (this.processLogs.get(processId) ?? []).slice(-50))
                    void handler(event);
                return this.logBus.on(`process-monitor:logs:${processId}`, handler);
            },
        };
        this.sources = new Map();
        this.sourceStops = new Map();
    }
    bindSockets(sockets) {
        this.sockets = sockets;
        sockets.register?.('process-monitor');
        sockets.register?.('process-monitor:logs');
        return this;
    }
    registerAbort(processId, aborter) {
        this.aborters.set(processId, aborter);
        const existing = this.rows.get(processId);
        if (existing)
            this.track(processId, { ...existing, abortable: true });
        return this;
    }
    start(input) {
        const processId = input.targetId?.includes(':') ? input.targetId : `${String(input.kind ?? 'process').toLowerCase().replace(/\s+/g, '-')}:${input.targetId ?? makeId('proc')}`;
        if (input.aborter)
            this.registerAbort(processId, input.aborter);
        const row = this.track(processId, { packageName: input.packageName, kind: input.kind, label: input.title ?? processId, status: 'running', progress: 1, context: input.metadata, abortable: Boolean(input.aborter) }, input.context ?? {});
        this.appendLog(processId, 'info', `${row.label} started`, input.metadata, input.context ?? {});
        return row;
    }
    register(input, context = {}) {
        const processId = input.processId ?? input.id ?? input.targetId ?? `${String(input.kind ?? 'process').toLowerCase().replace(/\s+/g, '-')}:${makeId('proc')}`;
        if (input.aborter)
            this.registerAbort(processId, input.aborter);
        return this.track(processId, { packageName: input.packageName, kind: input.kind, label: input.title ?? input.name ?? processId, status: normalizeProcessStatus(input.status ?? 'running'), progress: input.progress ?? 1, context: input.metadata, abortable: Boolean(input.aborter) }, context);
    }
    update(processId, patch = {}, context = {}) {
        return this.track(processId, patch, context);
    }
    complete(processId, metadata, context = {}) {
        this.appendLog(processId, 'info', 'Process completed', metadata, context);
        return this.track(processId, { status: 'completed', progress: 100, completedAt: nowIso(), context: metadata }, context);
    }
    fail(processId, error, contextOrMetadata = {}, maybeContext = {}) {
        const message = error instanceof Error ? error.message : String(error);
        const context = 'traceId' in contextOrMetadata || 'userId' in contextOrMetadata || 'organizationId' in contextOrMetadata ? contextOrMetadata : maybeContext;
        const metadata = context === contextOrMetadata ? undefined : contextOrMetadata;
        this.appendLog(processId, 'error', message, metadata, context);
        return this.track(processId, { status: 'failed', progress: 100, completedAt: nowIso(), context: { error: message, ...metadata } }, context);
    }
    recordPackageSnapshot(name, health, context = {}) {
        const status = typeof health === 'function' ? 'idle' : (health.status === 'down' ? 'failed' : 'idle');
        return this.track(`package:${name}`, { packageName: name, kind: deriveKind(name), label: `${name} runtime`, status, progress: 0 }, context);
    }
    track(processId, patch = {}, context = {}) {
        const existing = this.rows.get(processId);
        const now = nowIso();
        const packageName = patch.packageName ?? existing?.packageName ?? '@connectingmatrix/logger';
        const row = {
            packageName,
            processId,
            internalPid: String(patch.pid ?? existing?.pid ?? (typeof process !== 'undefined' ? process.pid : processId)),
            label: patch.label ?? existing?.label ?? processId,
            status: normalizeProcessStatus(patch.status ?? existing?.status ?? 'running'),
            progress: patch.progress ?? existing?.progress,
            context: patch.context ?? existing?.context,
            startedAt: patch.startedAt ?? existing?.startedAt ?? now,
            completedAt: patch.completedAt ?? existing?.completedAt,
            abortReason: patch.abortReason ?? existing?.abortReason,
            kind: normalizeProcessKind(patch.kind ?? existing?.kind, packageName, processId),
            abortable: patch.abortable ?? existing?.abortable ?? this.aborters.has(processId),
            heartbeat: patch.heartbeat ?? existing?.heartbeat,
            updatedAt: now,
            pid: typeof process !== 'undefined' ? process.pid : undefined,
            memory: memorySnapshot(),
            ram: memorySnapshot(),
            cpu: cpuSnapshot(),
        };
        if (['completed', 'failed', 'aborted'].includes(row.status) && !row.completedAt)
            row.completedAt = now;
        row.id = processId;
        this.rows.set(processId, row);
        void this.bus.emit('process-monitor:live', row);
        void this.sockets?.broadcast?.('process-monitor', row, 'process.live', context.traceId);
        return row;
    }
    appendLog(processId, level, message, data, context = {}) {
        const row = this.rows.get(processId);
        const event = {
            packageName: row?.packageName ?? '@connectingmatrix/logger',
            level,
            message,
            data,
            at: nowIso(),
            traceId: context.traceId,
            pid: typeof process !== 'undefined' ? process.pid : undefined,
            memory: memorySnapshot(),
        };
        const list = this.processLogs.get(processId) ?? [];
        list.push(event);
        if (list.length > 1000)
            list.shift();
        this.processLogs.set(processId, list);
        this.globalLogs.push(event);
        if (this.globalLogs.length > 2000)
            this.globalLogs.shift();
        void this.logBus.emit(`process-monitor:logs:${processId}`, event);
        void this.sockets?.broadcast?.('process-monitor:logs', { processId, event }, 'process.log', context.traceId);
        return event;
    }
    list(filter = {}) {
        const normalizedKind = filter.kind ? normalizeProcessKind(filter.kind) : undefined;
        return [...this.rows.values()].filter((row) => (!normalizedKind || normalizeProcessKind(row.kind) === normalizedKind) && (!filter.status || row.status === filter.status) && (!filter.packageName || row.packageName === filter.packageName));
    }
    live(handler) {
        if (!handler)
            return this.list();
        void handler(this.list());
        return this.bus.on('process-monitor:live', handler);
    }
    async abort(processId, reason = 'aborted by user', context = {}) {
        const aborter = this.aborters.get(processId);
        if (aborter)
            await aborter(reason);
        this.aborters.delete(processId);
        const row = this.track(processId, { status: 'aborted', progress: 100, abortReason: reason, completedAt: nowIso(), abortable: false }, context);
        row.aborted = true;
        this.appendLog(processId, 'warn', `Process aborted: ${reason}`, { processId, reason }, context);
        return row;
    }
    kill(processId, reason = 'killed by user', context = {}) { return this.abort(processId, reason, context); }
    heartbeat(processId, input = {}, context = {}) {
        return this.track(processId, { ...(input.patch ?? {}), heartbeat: { status: input.status ?? 'ok', message: input.message, at: nowIso() } }, context);
    }
    bindRuntimeSource(source, options = { autoStart: true }) {
        this.sources.set(source.name, source);
        if (options.autoStart !== false)
            void this.startRuntimeSource(source.name);
        return this;
    }
    async startRuntimeSource(name) {
        const source = this.sources.get(name);
        if (!source || this.sourceStops.has(name))
            return;
        if (source.start) {
            await source.start((event) => { this.applyRuntimeEvent({ ...event, source: event.source ?? source.name, kind: event.kind ?? source.kind }); });
            if (source.stop)
                this.sourceStops.set(name, () => source.stop?.());
        }
        const listed = await source.list?.();
        for (const event of listed ?? [])
            this.applyRuntimeEvent({ ...event, source: event.source ?? source.name, kind: event.kind ?? source.kind });
    }
    async stopRuntimeSource(name) {
        const stop = this.sourceStops.get(name);
        if (stop)
            await stop();
        this.sourceStops.delete(name);
    }
    runtimeSources() {
        return [...this.sources.values()].map((source) => ({ name: source.name, kind: source.kind, live: this.sourceStops.has(source.name) }));
    }
    applyRuntimeEvent(event, context = {}) {
        const processId = runtimeEventProcessId(event);
        const status = runtimeEventStatus(event);
        const row = this.track(processId, {
            packageName: runtimeEventPackage(event),
            kind: runtimeEventKind(event),
            label: event.title ?? event.message ?? `${runtimeEventKind(event)} ${processId}`,
            status,
            progress: event.progress ?? (status === 'queued' ? 0 : status === 'running' ? 50 : 100),
            context: { ...(event.metadata ?? {}), source: event.source, workflowId: event.workflowId, executionId: event.executionId, runId: event.runId, projectId: event.projectId, agentId: event.agentId, swarmId: event.swarmId, nodeId: event.nodeId },
            abortable: true,
        }, context);
        if (event.type === 'log' || event.log || event.message || event.errorMessage) {
            const log = typeof event.log === 'object' && event.log ? event.log : undefined;
            const level = (log?.level === 'error' || status === 'failed') ? 'error' : (log?.level === 'warn' ? 'warn' : 'info');
            const message = log?.message ?? (typeof event.log === 'string' ? event.log : undefined) ?? event.errorMessage ?? event.message ?? String(event.type ?? status);
            this.appendLog(processId, level, message, { event }, context);
        }
        return row;
    }
    queueStatus(filter = {}) {
        return this.list(filter.kind ? { kind: filter.kind } : {}).filter((row) => {
            const ctx = row.context;
            return (!filter.workflowId || ctx?.workflowId === filter.workflowId) && (!filter.projectId || ctx?.projectId === filter.projectId) && (!filter.agentId || ctx?.agentId === filter.agentId) && (!filter.swarmId || ctx?.swarmId === filter.swarmId) && (!filter.nodeId || ctx?.nodeId === filter.nodeId);
        });
    }
    bindWorkflowExecutorPubsub(executor, config) {
        const source = {
            name: 'giga-wf-executor:workflow-execution-events',
            kind: 'workflow',
            start: async (handler) => {
                if (!executor.consumeWorkflowExecutionEvents)
                    return;
                const consumer = executor.consumeWorkflowExecutionEvents({ applyExecutionEvent: handler, config, handleExecutionEventError: ({ error, event }) => { this.appendLog(runtimeEventProcessId(event), 'error', error instanceof Error ? error.message : String(error), { event }); } });
                await consumer.start();
                this.sourceStops.set(source.name, () => consumer.stop({ force: true }));
            },
            list: async () => (executor.getRunning?.() ?? []).map((row) => ({ ...row, type: 'running', source: 'giga-wf-executor:running' })),
            abort: (processId, reason) => executor.cancelRun?.(processId) ?? executor.cancelWorkflow?.(processId) ?? this.appendLog(processId, 'warn', `Executor abort requested: ${reason ?? 'abort'}`),
        };
        return this.bindRuntimeSource(source, { autoStart: false });
    }
    health() { return { name: '@connectingmatrix/logger/process-monitor', status: 'ok', checkedAt: nowIso(), details: { processes: this.rows.size, logs: this.globalLogs.length, socketsBound: Boolean(this.sockets), runtimeSources: this.runtimeSources() } }; }
}
class LoggerRuntime {
    constructor() {
        this.setupConfig = { level: 'info' };
        this.packageHealth = new Map();
    }
    setup(config) {
        this.setupConfig = { ...this.setupConfig, ...config, files: { ...this.setupConfig.files, ...config.files } };
        if (config.sockets)
            this.bindSockets(config.sockets);
        return this;
    }
    bindSockets(sockets) {
        this.setupConfig.sockets = sockets;
        processMonitoring.bindSockets(sockets);
        this.setBroadcaster(async (payload) => {
            if (sockets.emitLog)
                await sockets.emitLog(payload);
            else
                await sockets.broadcast?.('logs', payload, 'runtime.log', payload.traceId);
        });
        PackageObservability.bind({ logger: this, sockets });
        return this;
    }
    setBroadcaster(broadcaster) {
        this.setupConfig.broadcaster = broadcaster;
        return this;
    }
    registerPackage(name, health) {
        this.packageHealth.set(name, health);
        processMonitoring.track(`package:${name}`, { packageName: name, label: `${name} runtime`, status: 'idle', kind: deriveKind(name), progress: 0 });
        return this;
    }
    async log(level, message, data) {
        const minLevel = this.setupConfig.level ?? 'info';
        const packageName = data && typeof data === 'object' && typeof data.packageName === 'string' ? String(data.packageName) : '@connectingmatrix/logger';
        const event = {
            packageName,
            level,
            message,
            data,
            at: nowIso(),
            pid: typeof process !== 'undefined' ? process.pid : undefined,
            memory: memorySnapshot(),
        };
        if (levelRank[level] < levelRank[minLevel])
            return event;
        const file = this.setupConfig.files?.[level];
        if (file) {
            mkdirSync(dirname(file), { recursive: true });
            appendFileSync(file, JSON.stringify(event) + '\n');
        }
        await this.setupConfig.broadcaster?.(event);
        processMonitoring.appendLog(`package:${packageName}`, level, message, data);
        return event;
    }
    debug(message, data) { return this.log('debug', message, data); }
    info(message, data) { return this.log('info', message, data); }
    warn(message, data) { return this.log('warn', message, data); }
    error(message, data) { return this.log('error', message, data); }
    trackProcess(processId, patch = {}, context = {}) {
        return processMonitoring.track(processId, patch, context);
    }
    trackPackageProcess(packageName, processId, patch = {}, context = {}) {
        return processMonitoring.track(processId, { ...patch, packageName }, context);
    }
    processLog(processId, level, message, data, context = {}) {
        return processMonitoring.appendLog(processId, level, message, data, context);
    }
    addProcessLog(processId, event, context = {}) {
        return processMonitoring.appendLog(processId, event.level, event.message, event.data, context);
    }
    abortProcess(processId, reason, context) { return processMonitoring.abort(processId, reason, context); }
    async processMonitorSnapshot() {
        const packages = [];
        for (const [name, probe] of this.packageHealth) {
            try {
                packages.push(await probe());
            }
            catch (error) {
                packages.push({ name, status: 'down', checkedAt: nowIso(), details: { error: error instanceof Error ? error.message : String(error) } });
            }
        }
        return { checkedAt: nowIso(), packages, processes: processMonitoring.list(), logs: processMonitoring.logs.list(undefined, 200) };
    }
    health() {
        return { name: '@connectingmatrix/logger', status: 'ok', checkedAt: nowIso(), details: { files: Object.keys(this.setupConfig.files ?? {}), level: this.setupConfig.level ?? 'info', registeredPackages: this.packageHealth.size, processMonitor: processMonitoring.health().details } };
    }
}
export const processMonitoring = new ProcessMonitoringRuntime();
export const ProcessMonitor = processMonitoring;
export const Logger = new LoggerRuntime();
export function LogDecorator(label) {
    return function decorator(_target, propertyKey, descriptor) {
        const original = descriptor.value;
        descriptor.value = async function wrapped(...args) {
            const name = label ?? String(propertyKey);
            await Logger.info(`${name}:start`, { argsCount: args.length });
            try {
                const result = await original.apply(this, args);
                await Logger.info(`${name}:success`);
                return result;
            }
            catch (error) {
                await Logger.error(`${name}:error`, { error: error instanceof Error ? error.message : String(error) });
                throw error;
            }
        };
        return descriptor;
    };
}
export const Log = LogDecorator;
export const graphql = {
    namespace: 'logger',
    typeDefs: `type PackageHealthStatus { name: String!, status: String!, checkedAt: String! } type Query { loggerHealth: String!, processMonitorSnapshot: String!, processMonitoringList(kind: String, status: String, packageName: String): String!, processMonitoringLive(kind: String): String!, processMonitoringQueueStatus(kind: String, workflowId: ID, projectId: ID, agentId: ID, swarmId: ID, nodeId: ID): String!, processMonitoringLogs(processId: ID!): String!, processMonitoringSources: String! } type Mutation { processMonitoringAbort(processId: ID!, reason: String): String!, processMonitoringKill(processId: ID!, reason: String): String! }`,
    resolvers: {
        Query: {
            loggerHealth: () => Logger.health().status,
            processMonitorSnapshot: async () => JSON.stringify(await Logger.processMonitorSnapshot()),
            processMonitoringList: (_, args) => JSON.stringify(processMonitoring.list(args)),
            processMonitoringLive: (_, args) => JSON.stringify(processMonitoring.live() instanceof Array ? processMonitoring.queueStatus({ kind: args.kind }) : processMonitoring.queueStatus({ kind: args.kind })),
            processMonitoringQueueStatus: (_, args) => JSON.stringify(processMonitoring.queueStatus(args)),
            processMonitoringSources: () => JSON.stringify(processMonitoring.runtimeSources()),
            processMonitoringLogs: (_, args) => JSON.stringify(processMonitoring.logs.live(args.processId)),
        },
        Mutation: {
            processMonitoringAbort: async (_, args, ctx) => JSON.stringify(await processMonitoring.abort(args.processId, args.reason, ctx)),
            processMonitoringKill: async (_, args, ctx) => JSON.stringify(await processMonitoring.kill(args.processId, args.reason, ctx)),
        },
    },
    migrations: ['migrations/0001_init.sql'],
};
function requestBody(request) {
    return (request && typeof request === 'object' && 'body' in request ? request.body : undefined) ?? {};
}
export const createPackage = () => ({
    name: '@connectingmatrix/logger',
    version: '0.4.0',
    health: () => Logger.health(),
    graphql,
    migrations: graphql.migrations,
    launcher: createStubLauncher,
    runtime: { Logger, ProcessMonitor, processMonitoring, observability: PackageObservability },
    routes: [
        { method: 'GET', path: '/logger/health', handler: () => Logger.health() },
        { method: 'GET', path: '/logger/process-monitor', handler: () => Logger.processMonitorSnapshot() },
        { method: 'GET', path: '/process-monitor/list', handler: () => processMonitoring.list() },
        { method: 'GET', path: '/process-monitoring/list', handler: () => processMonitoring.list() },
        { method: 'GET', path: '/process-monitor/live', handler: () => processMonitoring.live() },
        { method: 'GET', path: '/process-monitoring/live', handler: () => processMonitoring.live() },
        { method: 'GET', path: '/process-monitoring/queue-status', handler: (request) => processMonitoring.queueStatus(requestBody(request)) },
        { method: 'GET', path: '/process-monitoring/sources', handler: () => processMonitoring.runtimeSources() },
        { method: 'GET', path: '/process-monitor/logs/live', handler: (request) => processMonitoring.logs.live(String(requestBody(request).processId ?? '')) },
        { method: 'GET', path: '/process-monitoring/logs/live', handler: (request) => processMonitoring.logs.live(String(requestBody(request).processId ?? '')) },
        { method: 'POST', path: '/process-monitor/abort', handler: (request) => processMonitoring.abort(String(requestBody(request).processId ?? ''), String(requestBody(request).reason ?? 'aborted by user'), request.context ?? {}) },
        { method: 'POST', path: '/process-monitoring/abort', handler: (request) => processMonitoring.abort(String(requestBody(request).processId ?? ''), String(requestBody(request).reason ?? 'aborted by user'), request.context ?? {}) },
        { method: 'POST', path: '/process-monitor/kill', handler: (request) => processMonitoring.kill(String(requestBody(request).processId ?? ''), String(requestBody(request).reason ?? 'killed by user'), request.context ?? {}) },
        { method: 'POST', path: '/process-monitoring/kill', handler: (request) => processMonitoring.kill(String(requestBody(request).processId ?? ''), String(requestBody(request).reason ?? 'killed by user'), request.context ?? {}) },
        { method: 'POST', path: '/process-monitor/heartbeat', handler: (request) => processMonitoring.heartbeat(String(requestBody(request).processId ?? ''), requestBody(request), request.context ?? {}) },
        { method: 'GET', path: '/logger/launcher', handler: (request) => createStubLauncher(request.context ?? {}) },
    ],
});
export * from './contracts.js';
export * from './package-structure.js';
export * from './observability.js';
export * from './launcher.js';
