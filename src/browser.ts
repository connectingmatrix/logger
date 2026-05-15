import { nowIso } from './contracts.js';
export type BrowserLogLevel = 'debug' | 'info' | 'warn' | 'error';
export const Logger = {
  setup(_config: Record<string, unknown>) { return Logger; },
  log(level: BrowserLogLevel, message: string, data?: unknown) {
    const event = { level, message, data, at: nowIso() };
    console[level === 'debug' ? 'log' : level](message, data ?? '');
    return event;
  },
  info(message: string, data?: unknown) { return Logger.log('info', message, data); },
  warn(message: string, data?: unknown) { return Logger.log('warn', message, data); },
  error(message: string, data?: unknown) { return Logger.log('error', message, data); },
  debug(message: string, data?: unknown) { return Logger.log('debug', message, data); },
};
