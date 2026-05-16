import { initialProcessMonitorSnapshot } from './mockProcessMonitorData';
import type { ProcessMonitorMetrics, ProcessMonitorPatch, ProcessMonitorSnapshot, ProcessNode, RealtimeLogEntry, UserMetric } from './types';
import { createTimestamp } from './formatters';

export type ProcessMonitorListener = () => void;
export type ProcessMonitorDataSource = (api: ProcessMonitorRealtimeStore) => void | (() => void);

function cloneSnapshot(snapshot: ProcessMonitorSnapshot): ProcessMonitorSnapshot {
    return {
        ...snapshot,
        metrics: { ...snapshot.metrics, loadAverage: [...snapshot.metrics.loadAverage] as [number, number, number] },
        users: snapshot.users.map((user) => ({ ...user })),
        processes: snapshot.processes.map((process) => ({ ...process })),
        logs: snapshot.logs.map((log) => ({ ...log })),
        alerts: snapshot.alerts.map((alert) => ({ ...alert }))
    };
}

function mergeById<T extends { id: string }>(current: T[], updates: T[]): T[] {
    const next = new Map(current.map((item) => [item.id, item]));
    updates.forEach((item) => next.set(item.id, { ...next.get(item.id), ...item }));
    return Array.from(next.values());
}

export class ProcessMonitorRealtimeStore {
    private snapshot: ProcessMonitorSnapshot;
    private listeners = new Set<ProcessMonitorListener>();
    private teardownSource?: () => void;

    constructor(initialSnapshot: ProcessMonitorSnapshot = initialProcessMonitorSnapshot) {
        this.snapshot = cloneSnapshot(initialSnapshot);
    }

    subscribe = (listener: ProcessMonitorListener) => {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    };

    getSnapshot = () => this.snapshot;

    getServerSnapshot = () => this.snapshot;

    replaceSnapshot = (nextSnapshot: ProcessMonitorSnapshot) => {
        this.snapshot = cloneSnapshot({ ...nextSnapshot, updatedAt: nextSnapshot.updatedAt || createTimestamp() });
        this.notify();
    };

    patchSnapshot = (patch: ProcessMonitorPatch) => {
        this.snapshot = {
            ...this.snapshot,
            ...patch,
            metrics: patch.metrics ? { ...this.snapshot.metrics, ...patch.metrics } : this.snapshot.metrics,
            users: patch.users ? patch.users.map((user) => ({ ...user })) : this.snapshot.users,
            processes: patch.processes ? patch.processes.map((process) => ({ ...process })) : this.snapshot.processes,
            logs: patch.logs ? patch.logs.map((log) => ({ ...log })) : this.snapshot.logs,
            alerts: patch.alerts ? patch.alerts.map((alert) => ({ ...alert })) : this.snapshot.alerts,
            updatedAt: patch.updatedAt || createTimestamp()
        };
        this.notify();
    };

    setMetrics = (metrics: Partial<ProcessMonitorMetrics>) => {
        this.patchSnapshot({ metrics });
    };

    upsertUsers = (users: UserMetric[]) => {
        this.snapshot = {
            ...this.snapshot,
            users: mergeById(this.snapshot.users, users),
            updatedAt: createTimestamp()
        };
        this.notify();
    };

    upsertProcesses = (processes: ProcessNode[]) => {
        this.snapshot = {
            ...this.snapshot,
            processes: mergeById(this.snapshot.processes, processes),
            updatedAt: createTimestamp()
        };
        this.notify();
    };

    removeProcesses = (processIds: string[]) => {
        const removeSet = new Set(processIds);
        this.snapshot = {
            ...this.snapshot,
            processes: this.snapshot.processes.filter((process) => !removeSet.has(process.id)),
            updatedAt: createTimestamp()
        };
        this.notify();
    };

    appendLogs = (logs: RealtimeLogEntry[], cap = 5000) => {
        this.snapshot = {
            ...this.snapshot,
            logs: [...logs.map((log) => ({ ...log })), ...this.snapshot.logs].slice(0, cap),
            updatedAt: createTimestamp()
        };
        this.notify();
    };

    clearLogs = () => {
        this.snapshot = {
            ...this.snapshot,
            logs: [],
            updatedAt: createTimestamp()
        };
        this.notify();
    };

    connectSource = (source: ProcessMonitorDataSource) => {
        this.teardownSource?.();
        const maybeTeardown = source(this);
        this.teardownSource = typeof maybeTeardown === 'function' ? maybeTeardown : undefined;
    };

    disconnectSource = () => {
        this.teardownSource?.();
        this.teardownSource = undefined;
    };

    private notify() {
        this.listeners.forEach((listener) => listener());
    }
}

export const processMonitorRealtime = new ProcessMonitorRealtimeStore();

if (typeof window !== 'undefined') {
    window.processMonitorRealtime = processMonitorRealtime;
}

declare global {
    interface Window {
        processMonitorRealtime?: ProcessMonitorRealtimeStore;
    }
}
