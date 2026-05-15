import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { nowIso, type PackageHealth, type PackageModule } from './contracts.js';

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

const levelRank: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

class LoggerRuntime {
  private setupConfig: LoggerSetup = { level: 'info' };

  setup(config: LoggerSetup): this {
    this.setupConfig = { ...this.setupConfig, ...config, files: { ...this.setupConfig.files, ...config.files } };
    return this;
  }

  setBroadcaster(broadcaster: LoggerSetup['broadcaster']): this {
    this.setupConfig.broadcaster = broadcaster;
    return this;
  }

  async log(level: LogLevel, message: string, data?: unknown): Promise<LogEvent> {
    const minLevel = this.setupConfig.level ?? 'info';
    const event: LogEvent = {
      level,
      message,
      data,
      at: nowIso(),
      pid: typeof process !== 'undefined' ? process.pid : undefined,
      memory: typeof process !== 'undefined' && process.memoryUsage ? process.memoryUsage() : undefined,
    };
    if (levelRank[level] < levelRank[minLevel]) return event;
    const file = this.setupConfig.files?.[level];
    if (file) {
      mkdirSync(dirname(file), { recursive: true });
      appendFileSync(file, JSON.stringify(event) + '\n');
    }
    await this.setupConfig.broadcaster?.(event);
    return event;
  }

  debug(message: string, data?: unknown) { return this.log('debug', message, data); }
  info(message: string, data?: unknown) { return this.log('info', message, data); }
  warn(message: string, data?: unknown) { return this.log('warn', message, data); }
  error(message: string, data?: unknown) { return this.log('error', message, data); }

  health(): PackageHealth {
    return { name: '@connectingmatrix/logger', status: 'ok', checkedAt: nowIso(), details: { files: Object.keys(this.setupConfig.files ?? {}), level: this.setupConfig.level ?? 'info' } };
  }
}

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

export const createPackage = (): PackageModule => ({
  name: '@connectingmatrix/logger',
  version: '0.1.0',
  health: () => Logger.health(),
  routes: [{ method: 'GET', path: '/logger/health', handler: () => Logger.health() }],
});

export * from './contracts.js';
