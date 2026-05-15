import { nowIso } from './contracts.js';
export const Logger = {
    setup(_config) { return Logger; },
    log(level, message, data) {
        const event = { level, message, data, at: nowIso() };
        console[level === 'debug' ? 'log' : level](message, data ?? '');
        return event;
    },
    info(message, data) { return Logger.log('info', message, data); },
    warn(message, data) { return Logger.log('warn', message, data); },
    error(message, data) { return Logger.log('error', message, data); },
    debug(message, data) { return Logger.log('debug', message, data); },
};
