import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { LocalEventBus, makeId, nowIso, type PackageHealth, type PackageModule, type RequestContext } from './contracts.js';
import { PackageObservability, type RuntimeLogLevel, type RuntimeLogEvent, type RuntimeProcessSnapshot, type RuntimeSocketLike, type RuntimeProcessStatus } from './observability.js';
import { createStubLauncher } from './launcher.js';

export type LogLevel = RuntimeLogLevel;
export interface LoggerSetup {
  files?: Partial<Record<LogLevel, string>>;
  broadcaster?: (payload: LogEvent) => Promise<void> | void;
  level?: LogLevel;
  sockets?: RuntimeSocketLike;
}

export interface LogEvent extends RuntimeLogEvent {}
export type PackageHealthProbe = () => PackageHealth | Promise<PackageHealth>;
export type MonitoredProcessKind = 'Workflows' | 'Ai Agents' | 'Swarm' | 'Projects' | 'Nodes' | 'Chat' | 'Server' | 'Other';
export interface MonitoredProcess extends RuntimeProcessSnapshot {
  id?: string;
  kind: MonitoredProcessKind | string;
  internalPid: string;
  cpu?: { userMicros: number; systemMicros: number };
  ram?: RuntimeProcessSnapshot['memory'];
  abortable: boolean;
  aborted?: boolean;
  heartbeat?: { status: 'ok' | 'error' | 'stale'; message?: string; at: string };
}
export interface ProcessMonitorSnapshot { checkedAt: string; packages: PackageHealth[]; processes: MonitoredProcess[]; logs: RuntimeLogEvent[]; }
export type ProcessLiveHandler = (snapshot: MonitoredProcess[] | MonitoredProcess) => void | Promise<void>;
export type ProcessLogHandler = (event: RuntimeLogEvent) => void | Promise<void>;

const levelRank: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

function memorySnapshot(): RuntimeLogEvent['memory'] | undefined {
  const proc = typeof process !== 'undefined' ? process : undefined;
  if (!proc?.memoryUsage) return undefined;
  const memory = proc.memoryUsage();
  return { rss: memory.rss, heapUsed: memory.heapUsed, heapTotal: memory.heapTotal, external: memory.external };
}
function cpuSnapshot(): MonitoredProcess['cpu'] | undefined {
  const proc = typeof process !== 'undefined' ? process as unknown as { cpuUsage?: () => { user: number; system: number } } : undefined;
  if (!proc?.cpuUsage) return undefined;
  const cpu = proc.cpuUsage();
  return { userMicros: cpu.user, systemMicros: cpu.system };
}
function deriveKind(packageName?: string, processId?: string): MonitoredProcessKind | string {
  const key = `${packageName ?? ''}:${processId ?? ''}`.toLowerCase();
  if (key.includes('workflow')) return 'Workflows';
  if (key.includes('swarm')) return 'Swarm';
  if (key.includes('project')) return 'Projects';
  if (key.includes('node')) return 'Nodes';
  if (key.includes('chat')) return 'Chat';
  if (key.includes('agent')) return 'Ai Agents';
  if (key.includes('server')) return 'Server';
  return 'Other';
}

function normalizeProcessKind(kind?: string, packageName?: string, processId?: string): string {
  const raw = String(kind ?? deriveKind(packageName, processId)).toLowerCase().replace(/[_-]+/g, ' ').trim();
  if (raw.includes('workflow')) return 'Workflows';
  if (raw.includes('ai') && raw.includes('agent')) return 'Ai Agents';
  if (raw.includes('swarm')) return 'Swarm';
  if (raw.includes('project')) return 'Projects';
  if (raw.includes('node')) return 'Nodes';
  if (raw.includes('file')) return 'Files';
  if (raw.includes('drive')) return 'Drive';
  if (raw.includes('server')) return 'Server';
  return kind ?? deriveKind(packageName, processId);
}

function normalizeProcessStatus(status?: RuntimeProcessStatus | string): RuntimeProcessStatus {
  if (status === 'errored') return 'failed';
  if (['idle','queued','running','completed','failed','aborted'].includes(String(status))) return status as RuntimeProcessStatus;
  return 'running';
}

class ProcessMonitoringRuntime {
  private sockets?: RuntimeSocketLike;
  private readonly bus = new LocalEventBus();
  private readonly logBus = new LocalEventBus();
  private readonly rows = new Map<string, MonitoredProcess>();
  private readonly processLogs = new Map<string, RuntimeLogEvent[]>();
  private readonly globalLogs: RuntimeLogEvent[] = [];
  private readonly aborters = new Map<string, (reason?: string) => Promise<void> | void>();

  bindSockets(sockets: RuntimeSocketLike): this {
    this.sockets = sockets;
    sockets.register?.('process-monitor');
    sockets.register?.('process-monitor:logs');
    return this;
  }

  registerAbort(processId: string, aborter: (reason?: string) => Promise<void> | void): this {
    this.aborters.set(processId, aborter);
    const existing = this.rows.get(processId);
    if (existing) this.track(processId, { ...existing, abortable: true });
    return this;
  }

  start(input: { kind?: string; packageName?: string; title?: string; targetId?: string; context?: RequestContext; metadata?: Record<string, unknown>; aborter?: (reason?: string) => Promise<void> | void }): MonitoredProcess {
    const processId = input.targetId?.includes(':') ? input.targetId : `${String(input.kind ?? 'process').toLowerCase().replace(/\s+/g, '-')}:${input.targetId ?? makeId('proc')}`;
    if (input.aborter) this.registerAbort(processId, input.aborter);
    const row = this.track(processId, { packageName: input.packageName, kind: input.kind, label: input.title ?? processId, status: 'running', progress: 1, context: input.metadata, abortable: Boolean(input.aborter) }, input.context ?? {});
    this.appendLog(processId, 'info', `${row.label} started`, input.metadata, input.context ?? {});
    return row;
  }

  register(input: { id?: string; processId?: string; kind?: string; packageName?: string; name?: string; title?: string; targetId?: string; status?: string; progress?: number; metadata?: Record<string, unknown>; aborter?: (reason?: string) => Promise<void> | void }, context: RequestContext = {}): MonitoredProcess {
    const processId = input.processId ?? input.id ?? input.targetId ?? `${String(input.kind ?? 'process').toLowerCase().replace(/\s+/g, '-')}:${makeId('proc')}`;
    if (input.aborter) this.registerAbort(processId, input.aborter);
    return this.track(processId, { packageName: input.packageName, kind: input.kind, label: input.title ?? input.name ?? processId, status: normalizeProcessStatus(input.status ?? 'running'), progress: input.progress ?? 1, context: input.metadata, abortable: Boolean(input.aborter) }, context);
  }

  update(processId: string, patch: Partial<Omit<RuntimeProcessSnapshot, 'processId' | 'updatedAt'>> & { packageName?: string; kind?: string; abortable?: boolean; heartbeat?: MonitoredProcess['heartbeat'] } = {}, context: RequestContext = {}): MonitoredProcess {
    return this.track(processId, patch, context);
  }

  complete(processId: string, metadata?: Record<string, unknown>, context: RequestContext = {}): MonitoredProcess {
    this.appendLog(processId, 'info', 'Process completed', metadata, context);
    return this.track(processId, { status: 'completed', progress: 100, completedAt: nowIso(), context: metadata }, context);
  }

  fail(processId: string, error: unknown, contextOrMetadata: RequestContext | Record<string, unknown> = {}, maybeContext: RequestContext = {}): MonitoredProcess {
    const message = error instanceof Error ? error.message : String(error);
    const context = 'traceId' in contextOrMetadata || 'userId' in contextOrMetadata || 'organizationId' in contextOrMetadata ? contextOrMetadata as RequestContext : maybeContext;
    const metadata = context === contextOrMetadata ? undefined : contextOrMetadata;
    this.appendLog(processId, 'error', message, metadata, context);
    return this.track(processId, { status: 'failed', progress: 100, completedAt: nowIso(), context: { error: message, ...(metadata as Record<string, unknown> | undefined) } }, context);
  }

  recordPackageSnapshot(name: string, health: PackageHealth | (() => PackageHealth | Promise<PackageHealth>), context: RequestContext = {}): MonitoredProcess {
    const status = typeof health === 'function' ? 'idle' : (health.status === 'down' ? 'failed' : 'idle');
    return this.track(`package:${name}`, { packageName: name, kind: deriveKind(name), label: `${name} runtime`, status, progress: 0 }, context);
  }

  track(processId: string, patch: Partial<Omit<RuntimeProcessSnapshot, 'processId' | 'updatedAt'>> & { packageName?: string; kind?: string; abortable?: boolean; heartbeat?: MonitoredProcess['heartbeat'] } = {}, context: RequestContext = {}): MonitoredProcess {
    const existing = this.rows.get(processId);
    const now = nowIso();
    const packageName = patch.packageName ?? existing?.packageName ?? '@connectingmatrix/logger';
    const row: MonitoredProcess = {
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
    if (['completed','failed','aborted'].includes(row.status) && !row.completedAt) row.completedAt = now;
    row.id = processId;
    this.rows.set(processId, row);
    void this.bus.emit('process-monitor:live', row);
    void this.sockets?.broadcast?.('process-monitor', row, 'process.live', context.traceId);
    return row;
  }

  appendLog(processId: string, level: RuntimeLogLevel, message: string, data?: unknown, context: RequestContext = {}): RuntimeLogEvent {
    const row = this.rows.get(processId);
    const event: RuntimeLogEvent = {
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
    if (list.length > 1000) list.shift();
    this.processLogs.set(processId, list);
    this.globalLogs.push(event);
    if (this.globalLogs.length > 2000) this.globalLogs.shift();
    void this.logBus.emit(`process-monitor:logs:${processId}`, event);
    void this.sockets?.broadcast?.('process-monitor:logs', { processId, event }, 'process.log', context.traceId);
    return event;
  }

  list(filter: { kind?: string; status?: string; packageName?: string } = {}): MonitoredProcess[] {
    const normalizedKind = filter.kind ? normalizeProcessKind(filter.kind) : undefined;
    return [...this.rows.values()].filter((row) => (!normalizedKind || normalizeProcessKind(row.kind) === normalizedKind) && (!filter.status || row.status === filter.status) && (!filter.packageName || row.packageName === filter.packageName));
  }

  live(handler?: ProcessLiveHandler): MonitoredProcess[] | (() => void) {
    if (!handler) return this.list();
    void handler(this.list());
    return this.bus.on('process-monitor:live', handler as never);
  }

  readonly logs = {
    list: (processId?: string, limit = 100): RuntimeLogEvent[] => {
      const max = Math.max(1, Math.min(1000, limit));
      if (!processId) return this.globalLogs.slice(-max);
      return (this.processLogs.get(processId) ?? []).slice(-max);
    },
    live: (processId: string, handler?: ProcessLogHandler): RuntimeLogEvent[] | (() => void) => {
      if (!handler) return (this.processLogs.get(processId) ?? []).slice(-100);
      for (const event of (this.processLogs.get(processId) ?? []).slice(-50)) void handler(event);
      return this.logBus.on(`process-monitor:logs:${processId}`, handler as never);
    },
  };

  async abort(processId: string, reason = 'aborted by user', context: RequestContext = {}): Promise<MonitoredProcess> {
    const aborter = this.aborters.get(processId);
    if (aborter) await aborter(reason);
    this.aborters.delete(processId);
    const row = this.track(processId, { status: 'aborted', progress: 100, abortReason: reason, completedAt: nowIso(), abortable: false }, context);
    row.aborted = true;
    this.appendLog(processId, 'warn', `Process aborted: ${reason}`, { processId, reason }, context);
    return row;
  }

  kill(processId: string, reason = 'killed by user', context: RequestContext = {}) { return this.abort(processId, reason, context); }

  heartbeat(processId: string, input: { status?: 'ok' | 'error' | 'stale'; message?: string; patch?: Partial<Omit<RuntimeProcessSnapshot, 'processId' | 'updatedAt'>> } = {}, context: RequestContext = {}): MonitoredProcess {
    return this.track(processId, { ...(input.patch ?? {}), heartbeat: { status: input.status ?? 'ok', message: input.message, at: nowIso() } }, context);
  }

  health(): PackageHealth { return { name: '@connectingmatrix/logger/process-monitor', status: 'ok', checkedAt: nowIso(), details: { processes: this.rows.size, logs: this.globalLogs.length, socketsBound: Boolean(this.sockets) } }; }
}

class LoggerRuntime {
  private setupConfig: LoggerSetup = { level: 'info' };
  private readonly packageHealth = new Map<string, PackageHealthProbe>();

  setup(config: LoggerSetup): this {
    this.setupConfig = { ...this.setupConfig, ...config, files: { ...this.setupConfig.files, ...config.files } };
    if (config.sockets) this.bindSockets(config.sockets);
    return this;
  }

  bindSockets(sockets: RuntimeSocketLike): this {
    this.setupConfig.sockets = sockets;
    processMonitoring.bindSockets(sockets);
    this.setBroadcaster(async (payload) => {
      if (sockets.emitLog) await sockets.emitLog(payload as unknown as Record<string, unknown>);
      else await sockets.broadcast?.('logs', payload, 'runtime.log', payload.traceId);
    });
    PackageObservability.bind({ logger: this, sockets });
    return this;
  }

  setBroadcaster(broadcaster: LoggerSetup['broadcaster']): this {
    this.setupConfig.broadcaster = broadcaster;
    return this;
  }

  registerPackage(name: string, health: PackageHealthProbe): this {
    this.packageHealth.set(name, health);
    processMonitoring.track(`package:${name}`, { packageName: name, label: `${name} runtime`, status: 'idle', kind: deriveKind(name), progress: 0 });
    return this;
  }

  async log(level: LogLevel, message: string, data?: unknown): Promise<LogEvent> {
    const minLevel = this.setupConfig.level ?? 'info';
    const packageName = data && typeof data === 'object' && typeof (data as { packageName?: unknown }).packageName === 'string' ? String((data as { packageName?: unknown }).packageName) : '@connectingmatrix/logger';
    const event: LogEvent = {
      packageName,
      level,
      message,
      data,
      at: nowIso(),
      pid: typeof process !== 'undefined' ? process.pid : undefined,
      memory: memorySnapshot(),
    };
    if (levelRank[level] < levelRank[minLevel]) return event;
    const file = this.setupConfig.files?.[level];
    if (file) {
      mkdirSync(dirname(file), { recursive: true });
      appendFileSync(file, JSON.stringify(event) + '\n');
    }
    await this.setupConfig.broadcaster?.(event);
    processMonitoring.appendLog(`package:${packageName}`, level, message, data);
    return event;
  }

  debug(message: string, data?: unknown) { return this.log('debug', message, data); }
  info(message: string, data?: unknown) { return this.log('info', message, data); }
  warn(message: string, data?: unknown) { return this.log('warn', message, data); }
  error(message: string, data?: unknown) { return this.log('error', message, data); }

  trackProcess(processId: string, patch: Partial<Omit<RuntimeProcessSnapshot, 'processId' | 'updatedAt'>> & { packageName?: string; kind?: string; abortable?: boolean } = {}, context: RequestContext = {}): MonitoredProcess {
    return processMonitoring.track(processId, patch, context);
  }

  trackPackageProcess(packageName: string, processId: string, patch: Partial<Omit<RuntimeProcessSnapshot, 'processId' | 'updatedAt'>> & { kind?: string; abortable?: boolean } = {}, context: RequestContext = {}): MonitoredProcess {
    return processMonitoring.track(processId, { ...patch, packageName }, context);
  }

  processLog(processId: string, level: RuntimeLogLevel, message: string, data?: unknown, context: RequestContext = {}) {
    return processMonitoring.appendLog(processId, level, message, data, context);
  }

  addProcessLog(processId: string, event: Partial<RuntimeLogEvent> & { level: RuntimeLogLevel; message: string; processId?: string }, context: RequestContext = {}) {
    return processMonitoring.appendLog(processId, event.level, event.message, event.data, context);
  }

  abortProcess(processId: string, reason?: string, context?: RequestContext) { return processMonitoring.abort(processId, reason, context); }

  async processMonitorSnapshot(): Promise<ProcessMonitorSnapshot> {
    const packages: PackageHealth[] = [];
    for (const [name, probe] of this.packageHealth) {
      try { packages.push(await probe()); }
      catch (error) { packages.push({ name, status: 'down', checkedAt: nowIso(), details: { error: error instanceof Error ? error.message : String(error) } }); }
    }
    return { checkedAt: nowIso(), packages, processes: processMonitoring.list(), logs: processMonitoring.logs.list(undefined, 200) };
  }

  health(): PackageHealth {
    return { name: '@connectingmatrix/logger', status: 'ok', checkedAt: nowIso(), details: { files: Object.keys(this.setupConfig.files ?? {}), level: this.setupConfig.level ?? 'info', registeredPackages: this.packageHealth.size, processMonitor: processMonitoring.health().details } };
  }
}

export const processMonitoring = new ProcessMonitoringRuntime();
export const ProcessMonitor = processMonitoring;
export const Logger = new LoggerRuntime();

export function LogDecorator(label?: string) {
  return function decorator(_target: unknown, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    const original = descriptor.value;
    descriptor.value = async function wrapped(...args: unknown[]) {
      const name = label ?? String(propertyKey);
      await Logger.info(`${name}:start`, { argsCount: args.length });
      try {
        const result = await original.apply(this, args);
        await Logger.info(`${name}:success`);
        return result;
      } catch (error) {
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
  typeDefs: `type PackageHealthStatus { name: String!, status: String!, checkedAt: String! } type Query { loggerHealth: String!, processMonitorSnapshot: String!, processMonitoringList(kind: String, status: String, packageName: String): String!, processMonitoringLogs(processId: ID!): String! } type Mutation { processMonitoringAbort(processId: ID!, reason: String): String!, processMonitoringKill(processId: ID!, reason: String): String! }`,
  resolvers: {
    Query: {
      loggerHealth: () => Logger.health().status,
      processMonitorSnapshot: async () => JSON.stringify(await Logger.processMonitorSnapshot()),
      processMonitoringList: (_: unknown, args: { kind?: string; status?: string; packageName?: string }) => JSON.stringify(processMonitoring.list(args)),
      processMonitoringLogs: (_: unknown, args: { processId: string }) => JSON.stringify(processMonitoring.logs.live(args.processId)),
    },
    Mutation: {
      processMonitoringAbort: async (_: unknown, args: { processId: string; reason?: string }, ctx: RequestContext) => JSON.stringify(await processMonitoring.abort(args.processId, args.reason, ctx)),
      processMonitoringKill: async (_: unknown, args: { processId: string; reason?: string }, ctx: RequestContext) => JSON.stringify(await processMonitoring.kill(args.processId, args.reason, ctx)),
    },
  },
  migrations: ['migrations/0001_init.sql'],
};

function requestBody(request: unknown): Record<string, unknown> {
  return (request && typeof request === 'object' && 'body' in request ? (request as { body?: Record<string, unknown> }).body : undefined) ?? {};
}

export const createPackage = (): PackageModule => ({
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
    { method: 'GET', path: '/process-monitor/logs/live', handler: (request) => processMonitoring.logs.live(String(requestBody(request).processId ?? '')) },
    { method: 'GET', path: '/process-monitoring/logs/live', handler: (request) => processMonitoring.logs.live(String(requestBody(request).processId ?? '')) },
    { method: 'POST', path: '/process-monitor/abort', handler: (request) => processMonitoring.abort(String(requestBody(request).processId ?? ''), String(requestBody(request).reason ?? 'aborted by user'), (request as { context?: RequestContext }).context ?? {}) },
    { method: 'POST', path: '/process-monitoring/abort', handler: (request) => processMonitoring.abort(String(requestBody(request).processId ?? ''), String(requestBody(request).reason ?? 'aborted by user'), (request as { context?: RequestContext }).context ?? {}) },
    { method: 'POST', path: '/process-monitor/kill', handler: (request) => processMonitoring.kill(String(requestBody(request).processId ?? ''), String(requestBody(request).reason ?? 'killed by user'), (request as { context?: RequestContext }).context ?? {}) },
    { method: 'POST', path: '/process-monitoring/kill', handler: (request) => processMonitoring.kill(String(requestBody(request).processId ?? ''), String(requestBody(request).reason ?? 'killed by user'), (request as { context?: RequestContext }).context ?? {}) },
    { method: 'POST', path: '/process-monitor/heartbeat', handler: (request) => processMonitoring.heartbeat(String(requestBody(request).processId ?? ''), requestBody(request) as { status?: 'ok' | 'error' | 'stale'; message?: string }, (request as { context?: RequestContext }).context ?? {}) },
    { method: 'GET', path: '/logger/launcher', handler: (request) => createStubLauncher((request as { context?: RequestContext }).context ?? {}) },
  ],
});

export * from './contracts.js';
export * from './package-structure.js';
export * from './observability.js';
export * from './launcher.js';
