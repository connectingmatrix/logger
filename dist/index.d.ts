import { type PackageHealth, type PackageModule, type RequestContext } from './contracts.js';
import { type RuntimeLogLevel, type RuntimeLogEvent, type RuntimeProcessSnapshot, type RuntimeSocketLike } from './observability.js';
export type LogLevel = RuntimeLogLevel;
export interface LoggerSetup {
    files?: Partial<Record<LogLevel, string>>;
    broadcaster?: (payload: LogEvent) => Promise<void> | void;
    level?: LogLevel;
    sockets?: RuntimeSocketLike;
}
export interface LogEvent extends RuntimeLogEvent {
}
export type PackageHealthProbe = () => PackageHealth | Promise<PackageHealth>;
export type MonitoredProcessKind = 'Workflows' | 'Ai Agents' | 'Swarm' | 'Projects' | 'Nodes' | 'Chat' | 'Server' | 'Other';
export interface MonitoredProcess extends RuntimeProcessSnapshot {
    id?: string;
    kind: MonitoredProcessKind | string;
    internalPid: string;
    cpu?: {
        userMicros: number;
        systemMicros: number;
    };
    ram?: RuntimeProcessSnapshot['memory'];
    abortable: boolean;
    aborted?: boolean;
    heartbeat?: {
        status: 'ok' | 'error' | 'stale';
        message?: string;
        at: string;
    };
}
export interface ProcessMonitorSnapshot {
    checkedAt: string;
    packages: PackageHealth[];
    processes: MonitoredProcess[];
    logs: RuntimeLogEvent[];
}
export type ProcessLiveHandler = (snapshot: MonitoredProcess[] | MonitoredProcess) => void | Promise<void>;
export type ProcessLogHandler = (event: RuntimeLogEvent) => void | Promise<void>;
export type RuntimeExternalEventKind = 'workflow' | 'ai-agent' | 'swarm' | 'project' | 'node' | 'system';
export interface RuntimeExternalEvent {
    source?: string;
    type?: 'queued' | 'started' | 'running' | 'heartbeat' | 'log' | 'completed' | 'failed' | 'aborted' | string;
    processId?: string;
    executionId?: string;
    runId?: string;
    workflowId?: string;
    projectId?: string;
    agentId?: string;
    swarmId?: string;
    nodeId?: string;
    packageName?: string;
    kind?: RuntimeExternalEventKind | string;
    title?: string;
    status?: string;
    progress?: number;
    log?: string | {
        level?: RuntimeLogLevel | string;
        message?: string;
        data?: unknown;
    };
    message?: string;
    errorMessage?: string;
    metadata?: Record<string, unknown>;
    payload?: unknown;
}
export interface RuntimeStatusSource {
    name: string;
    kind?: RuntimeExternalEventKind | string;
    start?: (handler: (event: RuntimeExternalEvent) => void | Promise<void>) => void | Promise<void>;
    stop?: () => void | Promise<void>;
    list?: () => RuntimeExternalEvent[] | Promise<RuntimeExternalEvent[]>;
    abort?: (processId: string, reason?: string) => unknown | Promise<unknown>;
    logs?: (processId: string) => RuntimeExternalEvent[] | Promise<RuntimeExternalEvent[]>;
}
declare class ProcessMonitoringRuntime {
    private sockets?;
    private readonly bus;
    private readonly logBus;
    private readonly rows;
    private readonly processLogs;
    private readonly globalLogs;
    private readonly aborters;
    bindSockets(sockets: RuntimeSocketLike): this;
    registerAbort(processId: string, aborter: (reason?: string) => Promise<void> | void): this;
    start(input: {
        kind?: string;
        packageName?: string;
        title?: string;
        targetId?: string;
        context?: RequestContext;
        metadata?: Record<string, unknown>;
        aborter?: (reason?: string) => Promise<void> | void;
    }): MonitoredProcess;
    register(input: {
        id?: string;
        processId?: string;
        kind?: string;
        packageName?: string;
        name?: string;
        title?: string;
        targetId?: string;
        status?: string;
        progress?: number;
        metadata?: Record<string, unknown>;
        aborter?: (reason?: string) => Promise<void> | void;
    }, context?: RequestContext): MonitoredProcess;
    update(processId: string, patch?: Partial<Omit<RuntimeProcessSnapshot, 'processId' | 'updatedAt'>> & {
        packageName?: string;
        kind?: string;
        abortable?: boolean;
        heartbeat?: MonitoredProcess['heartbeat'];
    }, context?: RequestContext): MonitoredProcess;
    complete(processId: string, metadata?: Record<string, unknown>, context?: RequestContext): MonitoredProcess;
    fail(processId: string, error: unknown, contextOrMetadata?: RequestContext | Record<string, unknown>, maybeContext?: RequestContext): MonitoredProcess;
    recordPackageSnapshot(name: string, health: PackageHealth | (() => PackageHealth | Promise<PackageHealth>), context?: RequestContext): MonitoredProcess;
    track(processId: string, patch?: Partial<Omit<RuntimeProcessSnapshot, 'processId' | 'updatedAt'>> & {
        packageName?: string;
        kind?: string;
        abortable?: boolean;
        heartbeat?: MonitoredProcess['heartbeat'];
    }, context?: RequestContext): MonitoredProcess;
    appendLog(processId: string, level: RuntimeLogLevel, message: string, data?: unknown, context?: RequestContext): RuntimeLogEvent;
    list(filter?: {
        kind?: string;
        status?: string;
        packageName?: string;
    }): MonitoredProcess[];
    live(handler?: ProcessLiveHandler): MonitoredProcess[] | (() => void);
    readonly logs: {
        list: (processId?: string, limit?: number) => RuntimeLogEvent[];
        live: (processId: string, handler?: ProcessLogHandler) => RuntimeLogEvent[] | (() => void);
    };
    abort(processId: string, reason?: string, context?: RequestContext): Promise<MonitoredProcess>;
    kill(processId: string, reason?: string, context?: RequestContext): Promise<MonitoredProcess>;
    heartbeat(processId: string, input?: {
        status?: 'ok' | 'error' | 'stale';
        message?: string;
        patch?: Partial<Omit<RuntimeProcessSnapshot, 'processId' | 'updatedAt'>>;
    }, context?: RequestContext): MonitoredProcess;
    private readonly sources;
    private readonly sourceStops;
    bindRuntimeSource(source: RuntimeStatusSource, options?: {
        autoStart?: boolean;
    }): this;
    startRuntimeSource(name: string): Promise<void>;
    stopRuntimeSource(name: string): Promise<void>;
    runtimeSources(): Array<{
        name: string;
        kind?: string;
        live: boolean;
    }>;
    applyRuntimeEvent(event: RuntimeExternalEvent, context?: RequestContext): MonitoredProcess;
    queueStatus(filter?: {
        kind?: string;
        workflowId?: string;
        projectId?: string;
        agentId?: string;
        swarmId?: string;
        nodeId?: string;
    }): MonitoredProcess[];
    bindWorkflowExecutorPubsub(executor: {
        consumeWorkflowExecutionEvents?: (options: {
            applyExecutionEvent: (event: RuntimeExternalEvent) => void | Promise<void>;
            config?: unknown;
            handleExecutionEventError?: (params: {
                error: unknown;
                event: unknown;
            }) => void | Promise<void>;
        }) => {
            start: () => Promise<void>;
            stop: (params?: {
                force?: boolean;
            }) => Promise<void>;
        };
        cancelRun?: (runId: string) => unknown;
        cancelWorkflow?: (workflowId: string) => unknown;
        getRunning?: (workflowId?: string | null) => unknown[];
    }, config?: unknown): this;
    health(): PackageHealth;
}
declare class LoggerRuntime {
    private setupConfig;
    private readonly packageHealth;
    setup(config: LoggerSetup): this;
    bindSockets(sockets: RuntimeSocketLike): this;
    setBroadcaster(broadcaster: LoggerSetup['broadcaster']): this;
    registerPackage(name: string, health: PackageHealthProbe): this;
    log(level: LogLevel, message: string, data?: unknown): Promise<LogEvent>;
    debug(message: string, data?: unknown): Promise<LogEvent>;
    info(message: string, data?: unknown): Promise<LogEvent>;
    warn(message: string, data?: unknown): Promise<LogEvent>;
    error(message: string, data?: unknown): Promise<LogEvent>;
    trackProcess(processId: string, patch?: Partial<Omit<RuntimeProcessSnapshot, 'processId' | 'updatedAt'>> & {
        packageName?: string;
        kind?: string;
        abortable?: boolean;
    }, context?: RequestContext): MonitoredProcess;
    trackPackageProcess(packageName: string, processId: string, patch?: Partial<Omit<RuntimeProcessSnapshot, 'processId' | 'updatedAt'>> & {
        kind?: string;
        abortable?: boolean;
    }, context?: RequestContext): MonitoredProcess;
    processLog(processId: string, level: RuntimeLogLevel, message: string, data?: unknown, context?: RequestContext): RuntimeLogEvent;
    addProcessLog(processId: string, event: Partial<RuntimeLogEvent> & {
        level: RuntimeLogLevel;
        message: string;
        processId?: string;
    }, context?: RequestContext): RuntimeLogEvent;
    abortProcess(processId: string, reason?: string, context?: RequestContext): Promise<MonitoredProcess>;
    processMonitorSnapshot(): Promise<ProcessMonitorSnapshot>;
    health(): PackageHealth;
}
export declare const processMonitoring: ProcessMonitoringRuntime;
export declare const ProcessMonitor: ProcessMonitoringRuntime;
export declare const Logger: LoggerRuntime;
export declare function LogDecorator(label?: string): (_target: unknown, propertyKey: string | symbol, descriptor: PropertyDescriptor) => PropertyDescriptor;
export declare const Log: typeof LogDecorator;
export declare const graphql: {
    namespace: string;
    typeDefs: string;
    resolvers: {
        Query: {
            loggerHealth: () => "ok" | "degraded" | "down";
            processMonitorSnapshot: () => Promise<string>;
            processMonitoringList: (_: unknown, args: {
                kind?: string;
                status?: string;
                packageName?: string;
            }) => string;
            processMonitoringLive: (_: unknown, args: {
                kind?: string;
            }) => string;
            processMonitoringQueueStatus: (_: unknown, args: {
                kind?: string;
                workflowId?: string;
                projectId?: string;
                agentId?: string;
                swarmId?: string;
                nodeId?: string;
            }) => string;
            processMonitoringSources: () => string;
            processMonitoringLogs: (_: unknown, args: {
                processId: string;
            }) => string;
        };
        Mutation: {
            processMonitoringAbort: (_: unknown, args: {
                processId: string;
                reason?: string;
            }, ctx: RequestContext) => Promise<string>;
            processMonitoringKill: (_: unknown, args: {
                processId: string;
                reason?: string;
            }, ctx: RequestContext) => Promise<string>;
        };
    };
    migrations: string[];
};
export declare const createPackage: () => PackageModule;
export * from './contracts.js';
export * from './package-structure.js';
export * from './observability.js';
export * from './launcher.js';
