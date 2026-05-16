import { Activity, Bell, Columns, Filter, Maximize, Moon, Pause, Play, Settings, Sun, Timer } from 'lucide-react';
import { useNavigate } from 'react-router';
import { LiveBadge } from '../../components/monitoring/LiveBadge';
import { ToolbarButton } from '../../components/monitoring/ToolbarButton';
import type { ProcessAccessMode } from '../types';
import type { RefObject } from 'react';

interface MonitorHeaderProps {
    title: string;
    accessMode: ProcessAccessMode;
    isLive: boolean;
    isDarkMode: boolean;
    timeRange: string;
    alertCount: number;
    onToggleLive: () => void;
    onToggleTheme: () => void;
    onOpenFilter: () => void;
    onOpenColumns: () => void;
    onOpenAlerts: () => void;
    onOpenSettings: () => void;
    onOpenTimeRange: () => void;
    refs: {
        filter: RefObject<HTMLButtonElement>;
        columns: RefObject<HTMLButtonElement>;
        alerts: RefObject<HTMLButtonElement>;
        settings: RefObject<HTMLButtonElement>;
        timeRange: RefObject<HTMLButtonElement>;
    };
}

export function MonitorHeader({ title, accessMode, isLive, isDarkMode, timeRange, alertCount, onToggleLive, onToggleTheme, onOpenFilter, onOpenColumns, onOpenAlerts, onOpenSettings, onOpenTimeRange, refs }: MonitorHeaderProps) {
    const navigate = useNavigate();

    return (
        <header className="relative z-20 flex flex-col gap-3 border-b border-border/80 bg-background/80 px-3 py-3 backdrop-blur-xl dark:border-white/10 dark:bg-[#07101c]/90 lg:flex-row lg:items-center">
            <div className="flex min-w-max items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/25">
                    <Activity className="h-6 w-6" />
                </div>
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-lg font-bold tracking-tight text-foreground md:text-xl">{title}</h1>
                        <LiveBadge isLive={isLive} />
                    </div>
                    <p className="text-xs text-muted-foreground">{accessMode === 'root' ? 'Root scope · all logged-in users' : 'Normal user scope · personal processes'}</p>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
                <ToolbarButton active={accessMode === 'root'} label="Root" title="Open root/admin dashboard" onClick={() => navigate('/dashboard-admin')} />
                <ToolbarButton active={accessMode === 'normal'} label="Normal" title="Open normal process monitoring" onClick={() => navigate('/process-monitor')} />
                <ToolbarButton ref={refs.timeRange} icon={<Timer className="h-4 w-4" />} label={timeRange} onClick={onOpenTimeRange} />
                <ToolbarButton icon={isLive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />} label={isLive ? 'Pause' : 'Resume'} active={!isLive} onClick={onToggleLive} />
                <ToolbarButton ref={refs.filter} icon={<Filter className="h-4 w-4" />} label="Filter" onClick={onOpenFilter} />
                <ToolbarButton ref={refs.columns} icon={<Columns className="h-4 w-4" />} label="Columns" onClick={onOpenColumns} />
                <ToolbarButton ref={refs.alerts} icon={<Bell className="h-4 w-4" />} label="Alerts" badge={alertCount} onClick={onOpenAlerts} />
                <ToolbarButton ref={refs.settings} icon={<Settings className="h-4 w-4" />} label="Settings" onClick={onOpenSettings} />
                <ToolbarButton icon={isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />} label={isDarkMode ? 'Light' : 'Dark'} onClick={onToggleTheme} />
                <ToolbarButton icon={<Maximize className="h-4 w-4" />} title="Fullscreen layout" onClick={() => document.documentElement.requestFullscreen?.()} />
            </div>
        </header>
    );
}
