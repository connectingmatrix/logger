export type ProcessAccessMode = 'root' | 'normal';

export type UserStatus = 'active' | 'idle' | 'disconnected' | 'system';
export type ProcessStatus = 'running' | 'sleeping' | 'stopped' | 'zombie';
export type LogLevel = 'INFO' | 'DEBUG' | 'WARN' | 'ERROR';

export interface UserMetric {
    id: string;
    name: string;
    cpu: number;
    memoryBytes: number;
    processCount: number;
    status: UserStatus;
    role?: 'root' | 'normal' | 'service' | 'system';
}

export interface ProcessNode {
    id: string;
    pid: number;
    parentId: string | null;
    name: string;
    command?: string;
    userId: string;
    cpu: number;
    memoryBytes: number;
    status: ProcessStatus;
    type?: 'system' | 'shell' | 'node' | 'database' | 'nginx' | 'docker' | 'python' | 'browser' | 'editor' | 'service' | 'other';
}

export interface RealtimeLogEntry {
    id: string;
    timestamp: string;
    processId?: string;
    processName: string;
    pid?: number;
    userId?: string;
    level: LogLevel;
    message: string;
}

export interface ProcessMonitorMetrics {
    totalProcesses: number;
    totalUsers: number;
    cpuUsage: number;
    memoryUsedBytes: number;
    memoryTotalBytes: number;
    loadAverage: [number, number, number];
    activeAlerts: number;
    uptime: string;
    networkGbps: number;
    diskMbps: number;
}

export interface MonitorAlert {
    id: string;
    title: string;
    message: string;
    level: Exclude<LogLevel, 'INFO' | 'DEBUG'>;
}

export interface ProcessMonitorSnapshot {
    updatedAt: string;
    metrics: ProcessMonitorMetrics;
    users: UserMetric[];
    processes: ProcessNode[];
    logs: RealtimeLogEntry[];
    alerts: MonitorAlert[];
}

export interface ProcessMonitorFilters {
    logLevels: Record<LogLevel, boolean>;
    processStatuses: Record<ProcessStatus, boolean>;
    minCpu: number;
}

export interface MonitorColumnState {
    users: {
        user: boolean;
        cpu: boolean;
        memory: boolean;
        processes: boolean;
        status: boolean;
    };
    processes: {
        process: boolean;
        pid: boolean;
        cpu: boolean;
        memory: boolean;
        status: boolean;
    };
    logs: {
        time: boolean;
        process: boolean;
        pid: boolean;
        level: boolean;
        message: boolean;
    };
}

export interface MonitorSettingsState {
    compactRows: boolean;
    showSparklines: boolean;
    highContrast: boolean;
    reduceMotion: boolean;
    refreshIntervalMs: number;
    logLineCap: number;
}

export type ProcessMonitorPatch = Partial<Omit<ProcessMonitorSnapshot, 'metrics'>> & {
    metrics?: Partial<ProcessMonitorMetrics>;
};
