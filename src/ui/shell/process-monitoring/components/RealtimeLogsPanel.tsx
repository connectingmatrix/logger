import { Pause, Play, Search, Trash2 } from 'lucide-react';
import { MonitorPanel } from './MonitorPanel';
import { PanelHeader } from '../../components/monitoring/PanelHeader';
import { SearchInput } from '../../components/monitoring/SearchInput';
import { ToolbarButton } from '../../components/monitoring/ToolbarButton';
import { StatusDot } from '../../components/monitoring/StatusDot';
import type { LogLevel, MonitorColumnState, ProcessMonitorFilters, RealtimeLogEntry, UserMetric } from '../types';

interface RealtimeLogsPanelProps {
    logs: RealtimeLogEntry[];
    users: UserMetric[];
    selectedUserId: string;
    search: string;
    filters: ProcessMonitorFilters;
    columns: MonitorColumnState['logs'];
    isLive: boolean;
    compactRows: boolean;
    logLineCap: number;
    onSearchChange: (value: string) => void;
    onToggleLive: () => void;
    onClearLogs: () => void;
}

const levelClasses: Record<LogLevel, string> = {
    INFO: 'bg-primary/10 text-primary border-primary/20',
    DEBUG: 'bg-slate-500/12 text-slate-500 dark:text-slate-300 border-slate-500/20',
    WARN: 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-300 border-yellow-500/25',
    ERROR: 'bg-red-500/15 text-red-600 dark:text-red-300 border-red-500/25'
};

function filterLogs(logs: RealtimeLogEntry[], selectedUserId: string, search: string, filters: ProcessMonitorFilters) {
    const query = search.trim().toLowerCase();
    return logs.filter((log) => {
        const matchesUser = selectedUserId === 'all' || log.userId === selectedUserId;
        const matchesLevel = filters.logLevels[log.level];
        const matchesSearch = !query || log.message.toLowerCase().includes(query) || log.processName.toLowerCase().includes(query) || log.level.toLowerCase().includes(query) || String(log.pid ?? '').includes(query);

        return matchesUser && matchesLevel && matchesSearch;
    });
}

export function RealtimeLogsPanel({ logs, users, selectedUserId, search, filters, columns, isLive, compactRows, logLineCap, onSearchChange, onToggleLive, onClearLogs }: RealtimeLogsPanelProps) {
    const visibleLogs = filterLogs(logs, selectedUserId, search, filters).slice(0, logLineCap);
    const selectedUser = users.find((user) => user.id === selectedUserId);

    return (
        <MonitorPanel
            className="min-h-[520px]"
            bodyClassName="overflow-hidden"
            header={
                <PanelHeader
                    title="Real-time Logs"
                    subtitle={isLive ? `Streaming ${selectedUserId === 'all' ? 'all scopes' : (selectedUser?.name ?? selectedUserId)}` : 'Paused'}
                    actions={
                        <>
                            <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
                                <StatusDot status={isLive ? 'active' : 'restricted'} />
                                <span>{isLive ? 'Streaming' : 'Paused'}</span>
                            </div>
                            <SearchInput value={search} onChange={onSearchChange} placeholder="Search logs..." />
                            <ToolbarButton icon={isLive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />} onClick={onToggleLive} active={!isLive} className="w-9 px-0" title={isLive ? 'Pause logs' : 'Resume logs'} />
                            <ToolbarButton icon={<Trash2 className="h-4 w-4" />} onClick={onClearLogs} className="w-9 px-0" title="Clear logs" />
                        </>
                    }
                />
            }
        >
            <div className="flex h-full min-h-0 flex-col">
                <div className="grid min-w-[700px] grid-cols-[120px_minmax(160px,1fr)_78px_88px_minmax(280px,2fr)] gap-3 border-b border-border/80 bg-background/95 px-4 py-3 text-xs font-semibold text-muted-foreground dark:border-white/10 dark:bg-[#0b1726]/95">
                    <span className={columns.time ? '' : 'hidden'}>Time</span>
                    <span className={columns.process ? '' : 'hidden'}>Process</span>
                    <span className={columns.pid ? '' : 'hidden'}>PID</span>
                    <span className={columns.level ? '' : 'hidden'}>Level</span>
                    <span className={columns.message ? '' : 'hidden'}>Message</span>
                </div>

                <div className="min-h-0 flex-1 overflow-auto">
                    <div className="min-w-[700px]">
                        {visibleLogs.map((log) => (
                            <div
                                key={log.id}
                                className={`grid grid-cols-[120px_minmax(160px,1fr)_78px_88px_minmax(280px,2fr)] items-center gap-3 border-b border-border/60 px-4 font-mono text-xs transition-colors hover:bg-primary/10 dark:border-white/10 dark:hover:bg-primary/15 ${
                                    compactRows ? 'min-h-8 py-1.5' : 'min-h-10 py-2'
                                }`}
                            >
                                <div className={`${columns.time ? '' : 'hidden'} tabular-nums text-muted-foreground`}>{log.timestamp}</div>
                                <div className={`${columns.process ? '' : 'hidden'} truncate text-foreground`}>{log.processName}</div>
                                <div className={`${columns.pid ? '' : 'hidden'} tabular-nums text-muted-foreground`}>{log.pid ?? '—'}</div>
                                <div className={columns.level ? '' : 'hidden'}>
                                    <span className={`rounded-md border px-2 py-1 text-[10px] font-bold ${levelClasses[log.level]}`}>{log.level}</span>
                                </div>
                                <div className={`${columns.message ? '' : 'hidden'} truncate ${log.level === 'ERROR' ? 'text-red-500 dark:text-red-300' : log.level === 'WARN' ? 'text-yellow-600 dark:text-yellow-300' : 'text-foreground'}`}>
                                    {log.message}
                                </div>
                            </div>
                        ))}

                        {visibleLogs.length === 0 && (
                            <div className="grid min-h-[300px] place-items-center px-6 py-14 text-center text-muted-foreground">
                                <div>
                                    <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-border bg-muted/40 dark:border-white/10 dark:bg-white/5">
                                        <Search className="h-7 w-7" />
                                    </div>
                                    <h3 className="text-base font-semibold text-foreground">No log lines matched</h3>
                                    <p className="mt-1 max-w-sm text-sm">Realtime log entries will stream here and this panel scrolls independently.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </MonitorPanel>
    );
}
