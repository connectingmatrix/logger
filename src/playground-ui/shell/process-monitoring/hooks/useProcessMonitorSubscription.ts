import { useEffect, useSyncExternalStore } from 'react';
import { processMonitorRealtime } from '../realtimeProcessStore';
import type { ProcessMonitorSnapshot } from '../types';

export function useProcessMonitorSubscription(): ProcessMonitorSnapshot {
    return useSyncExternalStore(processMonitorRealtime.subscribe, processMonitorRealtime.getSnapshot, processMonitorRealtime.getServerSnapshot);
}

export function useDemoRealtimeFeed(enabled: boolean, logLineCap: number, refreshIntervalMs = 3500) {
    useEffect(() => {
        if (!enabled) return;

        const interval = window.setInterval(() => {
            const snapshot = processMonitorRealtime.getSnapshot();
            const jitter = Math.random() * 2 - 1;
            const nextCpuUsage = Math.max(1, Math.min(99, snapshot.metrics.cpuUsage + jitter));
            const process = snapshot.processes[Math.floor(Math.random() * snapshot.processes.length)];

            processMonitorRealtime.setMetrics({
                cpuUsage: Number(nextCpuUsage.toFixed(1)),
                networkGbps: Number(Math.max(0.1, snapshot.metrics.networkGbps + jitter / 12).toFixed(2))
            });

            if (process) {
                processMonitorRealtime.upsertProcesses([
                    {
                        ...process,
                        cpu: Number(Math.max(0, Math.min(95, process.cpu + jitter)).toFixed(1))
                    }
                ]);

                processMonitorRealtime.appendLogs(
                    [
                        {
                            id: `live-${Date.now()}`,
                            timestamp: new Date().toLocaleTimeString('en-US', {
                                hour12: false,
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit'
                            }),
                            processId: process.id,
                            processName: process.name,
                            pid: process.pid,
                            userId: process.userId,
                            level: Math.random() > 0.93 ? 'WARN' : 'INFO',
                            message: Math.random() > 0.93 ? 'Realtime threshold warning' : 'Realtime sample received'
                        }
                    ],
                    logLineCap
                );
            }
        }, refreshIntervalMs);

        return () => window.clearInterval(interval);
    }, [enabled, logLineCap, refreshIntervalMs]);
}
