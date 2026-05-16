import { Popover, PopoverSection, CheckRow, RadioRow, SettingRow } from '../../components/monitoring/Popover';
import { Toggle } from '../../components/monitoring/Toggle';
import { Button } from '../../components/Button';
import { ACCENT_COLORS, type AccentColorKey } from '../../contexts/AccentColorContext';
import type { RefObject } from 'react';
import type { LogLevel, MonitorAlert, MonitorColumnState, MonitorSettingsState, ProcessMonitorFilters, ProcessStatus } from '../types';

type MonitorPopoverName = 'filter' | 'columns' | 'alerts' | 'settings' | 'timeRange';

interface MonitorPopoversProps {
    refs: {
        filter: RefObject<HTMLButtonElement>;
        columns: RefObject<HTMLButtonElement>;
        alerts: RefObject<HTMLButtonElement>;
        settings: RefObject<HTMLButtonElement>;
        timeRange: RefObject<HTMLButtonElement>;
    };
    open: {
        filter: boolean;
        columns: boolean;
        alerts: boolean;
        settings: boolean;
        timeRange: boolean;
    };
    onClose: (name: MonitorPopoverName) => void;
    filters: ProcessMonitorFilters;
    setFilters: (filters: ProcessMonitorFilters) => void;
    columns: MonitorColumnState;
    setColumns: (columns: MonitorColumnState) => void;
    settings: MonitorSettingsState;
    setSettings: (settings: MonitorSettingsState) => void;
    alerts: MonitorAlert[];
    timeRange: string;
    setTimeRange: (value: string) => void;
    isDarkMode: boolean;
    toggleDarkMode: () => void;
    accentColor: AccentColorKey;
    setAccentColor: (color: AccentColorKey) => void;
}

const defaultFilters: ProcessMonitorFilters = {
    logLevels: { INFO: true, DEBUG: true, WARN: true, ERROR: true },
    processStatuses: { running: true, sleeping: true, stopped: true, zombie: true },
    minCpu: 0
};

const defaultColumns: MonitorColumnState = {
    users: { user: true, cpu: true, memory: true, processes: true, status: true },
    processes: { process: true, pid: true, cpu: true, memory: true, status: true },
    logs: { time: true, process: true, pid: true, level: true, message: true }
};

export function createDefaultMonitorColumns(): MonitorColumnState {
    return {
        users: { ...defaultColumns.users },
        processes: { ...defaultColumns.processes },
        logs: { ...defaultColumns.logs }
    };
}

export function createDefaultMonitorFilters(): ProcessMonitorFilters {
    return {
        logLevels: { ...defaultFilters.logLevels },
        processStatuses: { ...defaultFilters.processStatuses },
        minCpu: defaultFilters.minCpu
    };
}

export function MonitorPopovers({ refs, open, onClose, filters, setFilters, columns, setColumns, settings, setSettings, alerts, timeRange, setTimeRange, isDarkMode, toggleDarkMode, accentColor, setAccentColor }: MonitorPopoversProps) {
    const updateLogLevel = (level: LogLevel, checked: boolean) => {
        setFilters({ ...filters, logLevels: { ...filters.logLevels, [level]: checked } });
    };

    const updateProcessStatus = (status: ProcessStatus, checked: boolean) => {
        setFilters({ ...filters, processStatuses: { ...filters.processStatuses, [status]: checked } });
    };

    return (
        <>
            <Popover isOpen={open.filter} onClose={() => onClose('filter')} trigger={refs.filter.current} title="Filters" width={380}>
                <p className="mb-4 text-sm text-muted-foreground">Filter process rows and realtime log lines before they are rendered.</p>

                <PopoverSection title="Log levels">
                    {(Object.keys(filters.logLevels) as LogLevel[]).map((level) => (
                        <CheckRow key={level} label={level} checked={filters.logLevels[level]} onChange={(checked) => updateLogLevel(level, checked)} />
                    ))}
                </PopoverSection>

                <PopoverSection title="Process statuses">
                    {(Object.keys(filters.processStatuses) as ProcessStatus[]).map((status) => (
                        <CheckRow key={status} label={status.charAt(0).toUpperCase() + status.slice(1)} checked={filters.processStatuses[status]} onChange={(checked) => updateProcessStatus(status, checked)} />
                    ))}
                </PopoverSection>

                <PopoverSection title="CPU threshold">
                    <SettingRow label="Minimum CPU %">
                        <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={filters.minCpu}
                            onChange={(event) => setFilters({ ...filters, minCpu: Number(event.target.value) || 0 })}
                            className="h-9 w-24 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30 dark:border-white/10"
                        />
                    </SettingRow>
                </PopoverSection>

                <div className="flex gap-3 pt-4">
                    <Button variant="secondary" size="sm" onClick={() => setFilters(createDefaultMonitorFilters())}>
                        Reset
                    </Button>
                    <Button size="sm" onClick={() => onClose('filter')}>
                        Done
                    </Button>
                </div>
            </Popover>

            <Popover isOpen={open.columns} onClose={() => onClose('columns')} trigger={refs.columns.current} title="Columns" width={420}>
                <p className="mb-4 text-sm text-muted-foreground">Show or hide columns per panel. Primary identity columns stay enabled for readability.</p>

                <PopoverSection title="User tree">
                    <CheckRow label="User" checked={columns.users.user} onChange={() => undefined} disabled badge="required" />
                    <CheckRow label="CPU %" checked={columns.users.cpu} onChange={(checked) => setColumns({ ...columns, users: { ...columns.users, cpu: checked } })} />
                    <CheckRow label="Memory" checked={columns.users.memory} onChange={(checked) => setColumns({ ...columns, users: { ...columns.users, memory: checked } })} />
                    <CheckRow label="Processes" checked={columns.users.processes} onChange={(checked) => setColumns({ ...columns, users: { ...columns.users, processes: checked } })} />
                    <CheckRow label="Status" checked={columns.users.status} onChange={(checked) => setColumns({ ...columns, users: { ...columns.users, status: checked } })} />
                </PopoverSection>

                <PopoverSection title="Process tree">
                    <CheckRow label="Process Name" checked={columns.processes.process} onChange={() => undefined} disabled badge="required" />
                    <CheckRow label="PID" checked={columns.processes.pid} onChange={(checked) => setColumns({ ...columns, processes: { ...columns.processes, pid: checked } })} />
                    <CheckRow label="CPU %" checked={columns.processes.cpu} onChange={(checked) => setColumns({ ...columns, processes: { ...columns.processes, cpu: checked } })} />
                    <CheckRow label="Memory" checked={columns.processes.memory} onChange={(checked) => setColumns({ ...columns, processes: { ...columns.processes, memory: checked } })} />
                    <CheckRow label="Status" checked={columns.processes.status} onChange={(checked) => setColumns({ ...columns, processes: { ...columns.processes, status: checked } })} />
                </PopoverSection>

                <PopoverSection title="Realtime logs">
                    <CheckRow label="Time" checked={columns.logs.time} onChange={(checked) => setColumns({ ...columns, logs: { ...columns.logs, time: checked } })} />
                    <CheckRow label="Process" checked={columns.logs.process} onChange={(checked) => setColumns({ ...columns, logs: { ...columns.logs, process: checked } })} />
                    <CheckRow label="PID" checked={columns.logs.pid} onChange={(checked) => setColumns({ ...columns, logs: { ...columns.logs, pid: checked } })} />
                    <CheckRow label="Level" checked={columns.logs.level} onChange={(checked) => setColumns({ ...columns, logs: { ...columns.logs, level: checked } })} />
                    <CheckRow label="Message" checked={columns.logs.message} onChange={() => undefined} disabled badge="required" />
                </PopoverSection>

                <div className="flex gap-3 pt-4">
                    <Button variant="secondary" size="sm" onClick={() => setColumns(createDefaultMonitorColumns())}>
                        Reset columns
                    </Button>
                    <Button size="sm" onClick={() => onClose('columns')}>
                        Done
                    </Button>
                </div>
            </Popover>

            <Popover isOpen={open.alerts} onClose={() => onClose('alerts')} trigger={refs.alerts.current} title="Active Alerts" width={400}>
                <p className="mb-4 text-sm text-muted-foreground">Current alerts for the selected process scope.</p>
                <div className="space-y-3">
                    {alerts.map((alert) => (
                        <div key={alert.id} className="rounded-xl border border-border bg-muted/35 p-3 dark:border-white/10 dark:bg-white/5">
                            <div className={`text-xs font-bold ${alert.level === 'ERROR' ? 'text-red-500' : 'text-yellow-500'}`}>{alert.level}</div>
                            <div className="mt-1 font-semibold text-foreground">{alert.title}</div>
                            <p className="mt-1 text-sm text-muted-foreground">{alert.message}</p>
                        </div>
                    ))}
                </div>
                <div className="pt-4">
                    <Button size="sm" onClick={() => onClose('alerts')}>
                        Done
                    </Button>
                </div>
            </Popover>

            <Popover isOpen={open.settings} onClose={() => onClose('settings')} trigger={refs.settings.current} title="Settings" width={420}>
                <p className="mb-4 text-sm text-muted-foreground">Theme, accent color, density, and realtime rendering preferences.</p>

                <PopoverSection title="Appearance">
                    <SettingRow label="Dark mode">
                        <Toggle checked={isDarkMode} onChange={toggleDarkMode} />
                    </SettingRow>
                    <SettingRow label="Accent color">
                        <select
                            value={accentColor}
                            onChange={(event) => setAccentColor(event.target.value as AccentColorKey)}
                            className="h-9 min-w-[150px] rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30 dark:border-white/10"
                        >
                            {Object.entries(ACCENT_COLORS).map(([key, color]) => (
                                <option key={key} value={key}>
                                    {color.name}
                                </option>
                            ))}
                        </select>
                    </SettingRow>
                    <SettingRow label="Compact rows">
                        <Toggle checked={settings.compactRows} onChange={(checked) => setSettings({ ...settings, compactRows: checked })} />
                    </SettingRow>
                    <SettingRow label="Show metric sparklines">
                        <Toggle checked={settings.showSparklines} onChange={(checked) => setSettings({ ...settings, showSparklines: checked })} />
                    </SettingRow>
                    <SettingRow label="High contrast">
                        <Toggle checked={settings.highContrast} onChange={(checked) => setSettings({ ...settings, highContrast: checked })} />
                    </SettingRow>
                    <SettingRow label="Reduce motion">
                        <Toggle checked={settings.reduceMotion} onChange={(checked) => setSettings({ ...settings, reduceMotion: checked })} />
                    </SettingRow>
                </PopoverSection>

                <PopoverSection title="Realtime">
                    <SettingRow label="Refresh interval">
                        <select
                            value={String(settings.refreshIntervalMs)}
                            onChange={(event) => setSettings({ ...settings, refreshIntervalMs: Number(event.target.value) })}
                            className="h-9 min-w-[110px] rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30 dark:border-white/10"
                        >
                            <option value="800">0.8 sec</option>
                            <option value="1400">1.4 sec</option>
                            <option value="3000">3 sec</option>
                            <option value="5000">5 sec</option>
                        </select>
                    </SettingRow>
                    <SettingRow label="Log line cap">
                        <select
                            value={String(settings.logLineCap)}
                            onChange={(event) => setSettings({ ...settings, logLineCap: Number(event.target.value) })}
                            className="h-9 min-w-[110px] rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30 dark:border-white/10"
                        >
                            <option value="500">500</option>
                            <option value="1000">1000</option>
                            <option value="5000">5000</option>
                            <option value="10000">10000</option>
                        </select>
                    </SettingRow>
                </PopoverSection>

                <div className="flex gap-3 pt-4">
                    <Button variant="secondary" size="sm" onClick={() => setSettings({ compactRows: false, showSparklines: true, highContrast: false, reduceMotion: false, refreshIntervalMs: 1400, logLineCap: 5000 })}>
                        Reset layout
                    </Button>
                    <Button size="sm" onClick={() => onClose('settings')}>
                        Done
                    </Button>
                </div>
            </Popover>

            <Popover isOpen={open.timeRange} onClose={() => onClose('timeRange')} trigger={refs.timeRange.current} title="Time Range" width={320}>
                <PopoverSection>
                    {['Last 1 minute', 'Last 5 minutes', 'Last 15 minutes', 'Last 1 hour'].map((option) => (
                        <RadioRow key={option} label={option} checked={timeRange === option} onChange={() => setTimeRange(option)} name="time-range" />
                    ))}
                </PopoverSection>
            </Popover>
        </>
    );
}
