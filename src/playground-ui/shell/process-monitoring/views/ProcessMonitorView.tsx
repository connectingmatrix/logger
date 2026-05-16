import { useMemo, useRef, useState } from 'react';
import { MonitorHeader } from '../components/MonitorHeader';
import { MetricsGrid } from '../components/MetricsGrid';
import { UserTreePanel } from '../components/UserTreePanel';
import { ProcessTreePanel } from '../components/ProcessTreePanel';
import { RealtimeLogsPanel } from '../components/RealtimeLogsPanel';
import { MonitorFooter } from '../components/MonitorFooter';
import { MonitorPopovers, createDefaultMonitorColumns, createDefaultMonitorFilters } from '../components/MonitorPopovers';
import { processMonitorRealtime } from '../realtimeProcessStore';
import { useDemoRealtimeFeed, useProcessMonitorSubscription } from '../hooks/useProcessMonitorSubscription';
import { useDarkMode } from '../../contexts/DarkModeContext';
import { useAccentColor } from '../../contexts/AccentColorContext';
import type { MonitorSettingsState, ProcessAccessMode } from '../types';

interface ProcessMonitorViewProps {
    accessMode: ProcessAccessMode;
    title: string;
    normalUserId?: string;
    demoFeed?: boolean;
}

const defaultSettings: MonitorSettingsState = {
    compactRows: false,
    showSparklines: true,
    highContrast: false,
    reduceMotion: false,
    refreshIntervalMs: 1400,
    logLineCap: 5000
};

export function ProcessMonitorView({ accessMode, title, normalUserId = 'current-user', demoFeed = false }: ProcessMonitorViewProps) {
    const snapshot = useProcessMonitorSubscription();
    const { isDarkMode, toggleDarkMode } = useDarkMode();
    const { accentColor, setAccentColor } = useAccentColor();

    const [isLive, setIsLive] = useState(true);
    const [selectedUserId, setSelectedUserId] = useState(accessMode === 'root' ? 'all' : normalUserId);
    const [userSearch, setUserSearch] = useState('');
    const [processSearch, setProcessSearch] = useState('');
    const [logSearch, setLogSearch] = useState('');
    const [filters, setFilters] = useState(createDefaultMonitorFilters());
    const [columns, setColumns] = useState(createDefaultMonitorColumns());
    const [settings, setSettings] = useState<MonitorSettingsState>(defaultSettings);
    const [timeRange, setTimeRange] = useState('Last 5 minutes');
    const [expandedUserGroups, setExpandedUserGroups] = useState(new Set(['logged-in', 'services']));
    const [expandedProcesses, setExpandedProcesses] = useState(
        new Set(['process-group:workflows', 'process-group:agents', 'process-group:projects', 'systemd', 'sshd', 'root-bash', 'node-server', 'nginx-master', 'postgres-master', 'docker-service', 'john-shell'])
    );
    const [openPopover, setOpenPopover] = useState({ filter: false, columns: false, alerts: false, settings: false, timeRange: false });

    const filterRef = useRef<HTMLButtonElement>(null);
    const columnsRef = useRef<HTMLButtonElement>(null);
    const alertsRef = useRef<HTMLButtonElement>(null);
    const settingsRef = useRef<HTMLButtonElement>(null);
    const timeRangeRef = useRef<HTMLButtonElement>(null);

    useDemoRealtimeFeed(isLive && demoFeed, settings.logLineCap, settings.refreshIntervalMs);

    const visibleUsers = useMemo(() => {
        if (accessMode === 'normal') {
            return snapshot.users.filter((user) => user.id === normalUserId);
        }
        return snapshot.users;
    }, [accessMode, normalUserId, snapshot.users]);

    const effectiveSelectedUserId = accessMode === 'normal' ? normalUserId : selectedUserId;

    const setSinglePopover = (name: keyof typeof openPopover, value: boolean) => {
        setOpenPopover({ filter: false, columns: false, alerts: false, settings: false, timeRange: false, [name]: value });
    };

    const toggleUserGroup = (groupId: string) => {
        setExpandedUserGroups((previous) => {
            const next = new Set(previous);
            if (next.has(groupId)) next.delete(groupId);
            else next.add(groupId);
            return next;
        });
    };

    const toggleProcess = (processId: string) => {
        setExpandedProcesses((previous) => {
            const next = new Set(previous);
            if (next.has(processId)) next.delete(processId);
            else next.add(processId);
            return next;
        });
    };

    const rootProcessesForScope = snapshot.processes.filter((process) => effectiveSelectedUserId === 'all' || process.userId === effectiveSelectedUserId || process.id.startsWith('process-group:'));
    const scopedProcessIds = rootProcessesForScope.map((process) => process.id);

    const shellClassName = [
        'relative flex h-[calc(100vh-49px)] min-h-[760px] flex-col overflow-hidden bg-gradient-to-b from-background to-muted/70 text-foreground dark:from-[#050913] dark:to-[#0a1018]',
        settings.highContrast ? 'contrast-125' : '',
        settings.reduceMotion ? '[&_*]:!animate-none [&_*]:!transition-none' : ''
    ].join(' ');

    return (
        <div className={shellClassName}>
            <div
                className="pointer-events-none absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
                style={{
                    backgroundImage: 'linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)',
                    backgroundSize: '32px 32px'
                }}
            />

            <MonitorHeader
                title={title}
                accessMode={accessMode}
                isLive={isLive}
                isDarkMode={isDarkMode}
                timeRange={timeRange}
                alertCount={snapshot.alerts.length}
                onToggleLive={() => setIsLive((value) => !value)}
                onToggleTheme={toggleDarkMode}
                onOpenFilter={() => setSinglePopover('filter', !openPopover.filter)}
                onOpenColumns={() => setSinglePopover('columns', !openPopover.columns)}
                onOpenAlerts={() => setSinglePopover('alerts', !openPopover.alerts)}
                onOpenSettings={() => setSinglePopover('settings', !openPopover.settings)}
                onOpenTimeRange={() => setSinglePopover('timeRange', !openPopover.timeRange)}
                refs={{ filter: filterRef, columns: columnsRef, alerts: alertsRef, settings: settingsRef, timeRange: timeRangeRef }}
            />

            <main className="relative z-10 flex flex-1 min-h-0 flex-col gap-3 overflow-auto p-3 md:p-4">
                <MetricsGrid metrics={snapshot.metrics} showSparklines={settings.showSparklines} />

                <section className="grid flex-1 min-h-[560px] grid-cols-1 gap-3 xl:grid-cols-[minmax(310px,0.84fr)_minmax(430px,1.08fr)_minmax(520px,1.42fr)]">
                    <UserTreePanel
                        users={visibleUsers}
                        accessMode={accessMode}
                        selectedUserId={effectiveSelectedUserId}
                        search={userSearch}
                        columns={columns.users}
                        compactRows={settings.compactRows}
                        expandedGroups={expandedUserGroups}
                        onSearchChange={setUserSearch}
                        onSelectUser={(userId) => setSelectedUserId(userId)}
                        onToggleGroup={toggleUserGroup}
                        onExpandAll={() => setExpandedUserGroups(new Set(['logged-in', 'services']))}
                        onCollapseAll={() => setExpandedUserGroups(new Set())}
                    />

                    <ProcessTreePanel
                        processes={snapshot.processes}
                        users={snapshot.users}
                        selectedUserId={effectiveSelectedUserId}
                        search={processSearch}
                        filters={filters}
                        columns={columns.processes}
                        expandedProcesses={expandedProcesses}
                        compactRows={settings.compactRows}
                        onSearchChange={setProcessSearch}
                        onToggleProcess={toggleProcess}
                        onExpandAll={() => setExpandedProcesses(new Set(scopedProcessIds))}
                        onCollapseAll={() => setExpandedProcesses(new Set())}
                    />

                    <RealtimeLogsPanel
                        logs={snapshot.logs}
                        users={snapshot.users}
                        selectedUserId={effectiveSelectedUserId}
                        search={logSearch}
                        filters={filters}
                        columns={columns.logs}
                        isLive={isLive}
                        compactRows={settings.compactRows}
                        logLineCap={settings.logLineCap}
                        onSearchChange={setLogSearch}
                        onToggleLive={() => setIsLive((value) => !value)}
                        onClearLogs={() => processMonitorRealtime.clearLogs()}
                    />
                </section>
            </main>

            <MonitorFooter metrics={snapshot.metrics} updatedAt={snapshot.updatedAt} isLive={isLive} logLineCap={settings.logLineCap} />

            <MonitorPopovers
                refs={{ filter: filterRef, columns: columnsRef, alerts: alertsRef, settings: settingsRef, timeRange: timeRangeRef }}
                open={openPopover}
                onClose={(name) => setOpenPopover((previous) => ({ ...previous, [name]: false }))}
                filters={filters}
                setFilters={setFilters}
                columns={columns}
                setColumns={setColumns}
                settings={settings}
                setSettings={setSettings}
                alerts={snapshot.alerts}
                timeRange={timeRange}
                setTimeRange={setTimeRange}
                isDarkMode={isDarkMode}
                toggleDarkMode={toggleDarkMode}
                accentColor={accentColor}
                setAccentColor={setAccentColor}
            />
        </div>
    );
}
