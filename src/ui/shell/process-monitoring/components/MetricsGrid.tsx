import { MetricCard } from '../../components/monitoring/MetricCard';
import type { ProcessMonitorMetrics } from '../types';
import { createSparkline, formatBytes, formatPercent } from '../formatters';

interface MetricsGridProps {
    metrics: ProcessMonitorMetrics;
    showSparklines: boolean;
}

export function MetricsGrid({ metrics, showSparklines }: MetricsGridProps) {
    const sparkline = (variant: 'blue' | 'green' | 'purple' | 'cyan' | 'red', seed: number) => (showSparklines ? { variant, data: createSparkline(seed) } : undefined);

    return (
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
            <MetricCard title="Total Processes" value={metrics.totalProcesses} sparkline={sparkline('blue', 2)} />
            <MetricCard title="Total Users" value={metrics.totalUsers} sparkline={sparkline('blue', 4)} />
            <MetricCard title="CPU Usage" value={formatPercent(metrics.cpuUsage)} sparkline={sparkline('green', 6)} />
            <MetricCard title="Memory Usage" value={formatBytes(metrics.memoryUsedBytes)} unit={`/ ${formatBytes(metrics.memoryTotalBytes)}`} sparkline={sparkline('purple', 8)} />
            <MetricCard title="Load Average" value={metrics.loadAverage.map((item) => item.toFixed(2)).join('  ')} sparkline={sparkline('blue', 10)} />
            <MetricCard title="Disk I/O" value={metrics.diskMbps} unit="MB/s" sparkline={sparkline('cyan', 12)} />
            <MetricCard title="Active Alerts" value={metrics.activeAlerts} sparkline={sparkline('red', 14)} />
            <MetricCard title="System Uptime" value={metrics.uptime} />
        </section>
    );
}
