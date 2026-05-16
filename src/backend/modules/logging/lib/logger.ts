import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import winston from 'winston';

const ALLOWED_LOG_LEVELS = Object.keys(winston.config.npm.levels);
const ENV_LOG_LEVEL = String(process.env.LOG_LEVEL || '')
  .trim()
  .toLowerCase();
const LOG_LEVEL_ALIASES: Record<string, string> = {
  on: 'info',
  off: 'off',
  warning: 'warn',
  none: 'off',
  silent: 'off',
};

const NORMALIZED_LOG_LEVEL = LOG_LEVEL_ALIASES[ENV_LOG_LEVEL] || ENV_LOG_LEVEL;
const LOGGING_DISABLED = NORMALIZED_LOG_LEVEL === 'off';
const LOG_LEVEL = ALLOWED_LOG_LEVELS.includes(NORMALIZED_LOG_LEVEL) ? NORMALIZED_LOG_LEVEL : 'error';

const SENSITIVE_KEY_PATTERN = /(authorization|token|secret|password|api[-_]?key)/i;
const MAX_META_DEPTH = 4;
const MAX_ARRAY_LENGTH = 25;
const MAX_STRING_LENGTH = 500;

function sanitizeValue(value: any, depth = 0): any {
  if (value === null || value === undefined) return value;
  if (depth >= MAX_META_DEPTH) return '[MaxDepth]';

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
  }

  if (typeof value === 'string') {
    if (value.length <= MAX_STRING_LENGTH) return value;
    return `${value.slice(0, MAX_STRING_LENGTH)}...[truncated]`;
  }

  if (typeof value !== 'object') return value;

  if (Array.isArray(value)) {
    const limited = value.slice(0, MAX_ARRAY_LENGTH).map((item) => sanitizeValue(item, depth + 1));
    if (value.length > MAX_ARRAY_LENGTH) {
      limited.push(`[+${value.length - MAX_ARRAY_LENGTH} more]`);
    }
    return limited;
  }

  const out: Record<string, any> = {};
  Object.entries(value).forEach(([key, val]) => {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      out[key] = '[REDACTED]';
      return;
    }
    out[key] = sanitizeValue(val, depth + 1);
  });
  return out;
}

function stringifyMeta(meta: Record<string, any>) {
  const keys = Object.keys(meta || {});
  if (!keys.length) return '';
  try {
    return ` ${JSON.stringify(sanitizeValue(meta))}`;
  } catch (error) {
    return ' {"meta":"[Unserializable metadata]"}';
  }
}

const consoleFormat = winston.format.printf((info) => {
  const { timestamp, level, message, scope, ...meta } = info;
  return `${timestamp} ${level} [${scope || 'app'}] ${message}${stringifyMeta(meta)}`;
});

export const appLogger = winston.createLogger({
  level: LOG_LEVEL,
  levels: winston.config.npm.levels,
  silent: LOGGING_DISABLED,
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize({ all: true }),
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
        winston.format.errors({ stack: true }),
        consoleFormat,
      ),
    }),
  ],
});

const lifecyclePath = path.resolve(os.homedir(), '.giga/logs/backend-lifecycle.log');

export const lifecycleLogger = winston.createLogger({
  level: LOG_LEVEL,
  levels: winston.config.npm.levels,
  silent: LOGGING_DISABLED,
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
    }),
  ],
});

fs.promises
  .mkdir(path.dirname(lifecyclePath), { recursive: true })
  .then(() => lifecycleLogger.add(new winston.transports.File({ filename: lifecyclePath, options: { flags: 'a' } })))
  .catch(() => undefined);

export function getScopedLogger(scope: string) {
  return appLogger.child({ scope });
}

export function toErrorMeta(error: any) {
  if (!error) return { message: 'Unknown error' };
  return sanitizeValue(error);
}
