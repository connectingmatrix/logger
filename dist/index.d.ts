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
export * from './services/package-status.service.js';
