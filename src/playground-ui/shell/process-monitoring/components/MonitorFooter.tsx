import { Clock, Gauge, HardDrive, RefreshCcw } from 'lucide-react';
import { SparklineChart } from '../../components/monitoring/SparklineChart';
import type { ProcessMonitorMetrics } from '../types';
import { formatBytes, formatPercent } from '../formatters';

interface MonitorFooterProps {
    metrics: ProcessMonitorMetrics;
    updatedAt: string;
    isLive: boolean;
    logLineCap: number;
}

export function MonitorFooter({ metrics, updatedAt, isLive, logLineCap }: MonitorFooterProps) {
    return (
        <footer className="relative z-10 grid gap-3 border-t border-border/80 bg-background/80 px-4 py-3 text-xs text-muted-foreground backdrop-blur dark:border-white/10 dark:bg-[#07101c]/90 md:grid-cols-2 xl:grid-cols-6">
            <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>System Uptime:</span>
                <strong className="text-foreground">{metrics.uptime}</strong>
            </div>
            <div className="flex items-center gap-2">
                <Gauge className="h-4 w-4" />
                <span>Load Average:</span>
                <strong className="text-foreground">{metrics.loadAverage.map((value) => value.toFixed(2)).join('  ')}</strong>
            </div>
            <div className="flex items-center gap-2">
                <span>CPU:</span>
                <strong className="text-foreground">{formatPercent(metrics.cpuUsage)}</strong>
                <SparklineChart variant="green" width={82} height={22} className="h-[22px] w-[82px]" />
            </div>
            <div className="flex items-center gap-2">
                <HardDrive className="h-4 w-4" />
                <span>Memory:</span>
                <strong className="text-foreground">{formatBytes(metrics.memoryUsedBytes)}</strong>
            </div>
            <div className="flex items-center gap-2">
                <RefreshCcw className={`h-4 w-4 ${isLive ? 'animate-spin text-primary' : ''}`} />
                <span>Last Updated:</span>
                <strong className="text-foreground">{updatedAt}</strong>
            </div>
            <div className="flex items-center gap-2 md:justify-end">
                <span>Log Lines:</span>
                <strong className="text-foreground">{logLineCap}</strong>
            </div>
        </footer>
    );
}
