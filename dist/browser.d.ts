export type BrowserLogLevel = 'debug' | 'info' | 'warn' | 'error';
export declare const Logger: {
    setup(_config: Record<string, unknown>): /*elided*/ any;
    log(level: BrowserLogLevel, message: string, data?: unknown): {
        level: BrowserLogLevel;
        message: string;
        data: unknown;
        at: string;
    };
    info(message: string, data?: unknown): {
        level: BrowserLogLevel;
        message: string;
        data: unknown;
        at: string;
    };
    warn(message: string, data?: unknown): {
        level: BrowserLogLevel;
        message: string;
        data: unknown;
        at: string;
    };
    error(message: string, data?: unknown): {
        level: BrowserLogLevel;
        message: string;
        data: unknown;
        at: string;
    };
    debug(message: string, data?: unknown): {
        level: BrowserLogLevel;
        message: string;
        data: unknown;
        at: string;
    };
};
