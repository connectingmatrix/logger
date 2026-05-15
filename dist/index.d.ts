import { type PackageHealth, type PackageModule } from './contracts.js';
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export interface LoggerSetup {
    files?: Partial<Record<LogLevel, string>>;
    broadcaster?: (payload: LogEvent) => Promise<void> | void;
    level?: LogLevel;
}
export interface LogEvent {
    level: LogLevel;
    message: string;
    data?: unknown;
    at: string;
    pid?: number;
    memory?: NodeJS.MemoryUsage;
}
declare class LoggerRuntime {
    private setupConfig;
    setup(config: LoggerSetup): this;
    setBroadcaster(broadcaster: LoggerSetup['broadcaster']): this;
    log(level: LogLevel, message: string, data?: unknown): Promise<LogEvent>;
    debug(message: string, data?: unknown): Promise<LogEvent>;
    info(message: string, data?: unknown): Promise<LogEvent>;
    warn(message: string, data?: unknown): Promise<LogEvent>;
    error(message: string, data?: unknown): Promise<LogEvent>;
    health(): PackageHealth;
}
export declare const Logger: LoggerRuntime;
export declare function LogDecorator(label?: string): (_target: unknown, propertyKey: string | symbol, descriptor: PropertyDescriptor) => PropertyDescriptor;
export declare const Log: typeof LogDecorator;
export declare const createPackage: () => PackageModule;
export * from './contracts.js';
