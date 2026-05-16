import type { RuntimeProcessKind, RuntimeProcessStatus } from '../observability.js';
export interface ProcessMonitoringFilter {
    kind?: RuntimeProcessKind;
    status?: RuntimeProcessStatus;
    packageName?: string;
    ownerId?: string;
}
export declare const processMonitoring: {
    bindWithServer(next: string): /*elided*/ any;
    list(filter?: ProcessMonitoringFilter): Promise<unknown>;
    live(filter?: ProcessMonitoringFilter): Promise<unknown>;
    logs: {
        live(processId: string): Promise<unknown>;
    };
    abort(processId: string, reason?: string): Promise<unknown>;
};
