import { ChevronDown, ChevronRight, Crown, Search, ServerCog, User, Users } from 'lucide-react';
import { MonitorPanel } from './MonitorPanel';
import { PanelHeader } from '../../components/monitoring/PanelHeader';
import { SearchInput } from '../../components/monitoring/SearchInput';
import { ToolbarButton } from '../../components/monitoring/ToolbarButton';
import { Legend } from '../../components/monitoring/Legend';
import { StatusDot } from '../../components/monitoring/StatusDot';
import type { MonitorColumnState, ProcessAccessMode, UserMetric } from '../types';
import { formatBytes, formatPercent } from '../formatters';

interface UserTreePanelProps {
    users: UserMetric[];
    accessMode: ProcessAccessMode;
    selectedUserId: string;
    search: string;
    columns: MonitorColumnState['users'];
    compactRows: boolean;
    expandedGroups: Set<string>;
    onSearchChange: (value: string) => void;
    onSelectUser: (userId: string) => void;
    onToggleGroup: (groupId: string) => void;
    onExpandAll: () => void;
    onCollapseAll: () => void;
}

function aggregateUsers(users: UserMetric[]): UserMetric {
    return {
        id: 'all',
        name: 'All Users',
        cpu: users.reduce((sum, user) => sum + user.cpu, 0),
        memoryBytes: users.reduce((sum, user) => sum + user.memoryBytes, 0),
        processCount: users.reduce((sum, user) => sum + user.processCount, 0),
        status: users.some((user) => user.status === 'active') ? 'active' : 'idle',
        role: 'system'
    };
}

function UserGlyph({ user }: { user: UserMetric }) {
    if (user.id === 'all') return <Users className="h-4 w-4" />;
    if (user.role === 'root') return <Crown className="h-4 w-4" />;
    if (user.role === 'service' || user.role === 'system') return <ServerCog className="h-4 w-4" />;
    return <User className="h-4 w-4" />;
}

function UserRow({ user, selected, columns, compactRows, level = 0, onClick }: { user: UserMetric; selected: boolean; columns: MonitorColumnState['users']; compactRows: boolean; level?: number; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`grid w-full grid-cols-[minmax(180px,1fr)_72px_96px_78px_96px] items-center gap-3 border-b border-border/60 px-4 text-left text-xs transition-colors hover:bg-primary/10 dark:border-white/10 dark:hover:bg-primary/20 ${
                selected ? 'bg-primary/10 ring-1 ring-inset ring-primary/20' : ''
            } ${compactRows ? 'min-h-9 py-1.5' : 'min-h-11 py-2.5'}`}
        >
            <div className={`${columns.user ? 'flex' : 'hidden'} min-w-0 items-center gap-2`} style={{ paddingLeft: `${level * 18}px` }}>
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/20">
                    <UserGlyph user={user} />
                </span>
                <span className="truncate font-semibold text-foreground">{user.name}</span>
            </div>
            <div className={`${columns.cpu ? '' : 'hidden'} tabular-nums text-green-600 dark:text-green-400`}>{formatPercent(user.cpu)}</div>
            <div className={`${columns.memory ? '' : 'hidden'} tabular-nums text-muted-foreground`}>{formatBytes(user.memoryBytes)}</div>
            <div className={`${columns.processes ? '' : 'hidden'} tabular-nums text-muted-foreground`}>{user.processCount}</div>
            <div className={columns.status ? '' : 'hidden'}>
                <StatusDot status={user.status === 'disconnected' ? 'restricted' : user.status} label={user.status === 'disconnected' ? 'Offline' : user.status.charAt(0).toUpperCase() + user.status.slice(1)} />
            </div>
        </button>
    );
}

export function UserTreePanel({ users, accessMode, selectedUserId, search, columns, compactRows, expandedGroups, onSearchChange, onSelectUser, onToggleGroup, onExpandAll, onCollapseAll }: UserTreePanelProps) {
    const query = search.trim().toLowerCase();
    const visibleUsers = users.filter((user) => !query || user.name.toLowerCase().includes(query) || user.role?.includes(query) || String(user.processCount).includes(query));

    const serviceUsers = visibleUsers.filter((user) => user.role === 'service' || user.role === 'system');
    const loggedInUsers = visibleUsers.filter((user) => user.role !== 'service' && user.role !== 'system');
    const allUser = aggregateUsers(users);

    const GroupHeader = ({ id, title, count }: { id: string; title: string; count: number }) => {
        const expanded = expandedGroups.has(id);
        return (
            <button
                type="button"
                onClick={() => onToggleGroup(id)}
                className="flex w-full items-center gap-2 border-b border-border/60 bg-muted/40 px-4 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-muted-foreground transition-colors hover:bg-primary/10 dark:border-white/10 dark:bg-white/5"
            >
                {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                <span>{title}</span>
                <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-primary">{count}</span>
            </button>
        );
    };

    return (
        <MonitorPanel
            header={
                <PanelHeader
                    title="User Tree"
                    subtitle={accessMode === 'root' ? 'Click a user to load its process tree' : 'Your realtime process scope'}
                    actions={
                        <>
                            <SearchInput value={search} onChange={onSearchChange} placeholder="Search users..." />
                            <ToolbarButton icon={<ChevronDown className="h-4 w-4" />} title="Expand all user groups" onClick={onExpandAll} className="w-9 px-0" />
                            <ToolbarButton icon={<ChevronRight className="h-4 w-4" />} title="Collapse all user groups" onClick={onCollapseAll} className="w-9 px-0" />
                        </>
                    }
                />
            }
            footer={
                <Legend
                    items={[
                        { status: 'active', label: 'Active' },
                        { status: 'idle', label: 'Idle' },
                        { status: 'restricted', label: 'Disconnected' },
                        { status: 'system', label: 'Service' }
                    ]}
                />
            }
        >
            <div className="min-w-[530px]">
                <div className="sticky top-0 z-10 grid grid-cols-[minmax(180px,1fr)_72px_96px_78px_96px] gap-3 border-b border-border/80 bg-background/95 px-4 py-3 text-xs font-semibold text-muted-foreground backdrop-blur dark:border-white/10 dark:bg-[#0b1726]/95">
                    <span className={columns.user ? '' : 'hidden'}>User</span>
                    <span className={columns.cpu ? '' : 'hidden'}>CPU %</span>
                    <span className={columns.memory ? '' : 'hidden'}>Memory</span>
                    <span className={columns.processes ? '' : 'hidden'}>Processes</span>
                    <span className={columns.status ? '' : 'hidden'}>Status</span>
                </div>

                {accessMode === 'root' && <UserRow user={allUser} selected={selectedUserId === 'all'} columns={columns} compactRows={compactRows} onClick={() => onSelectUser('all')} />}

                {accessMode === 'root' ? (
                    <>
                        <GroupHeader id="logged-in" title="Logged-in users" count={loggedInUsers.length} />
                        {expandedGroups.has('logged-in') &&
                            loggedInUsers.map((user) => <UserRow key={user.id} user={user} selected={selectedUserId === user.id} columns={columns} compactRows={compactRows} level={1} onClick={() => onSelectUser(user.id)} />)}

                        <GroupHeader id="services" title="Service accounts" count={serviceUsers.length} />
                        {expandedGroups.has('services') &&
                            serviceUsers.map((user) => <UserRow key={user.id} user={user} selected={selectedUserId === user.id} columns={columns} compactRows={compactRows} level={1} onClick={() => onSelectUser(user.id)} />)}
                    </>
                ) : (
                    visibleUsers.map((user) => <UserRow key={user.id} user={user} selected columns={columns} compactRows={compactRows} onClick={() => onSelectUser(user.id)} />)
                )}

                {visibleUsers.length === 0 && (
                    <div className="grid place-items-center gap-2 px-4 py-14 text-center text-muted-foreground">
                        <Search className="h-7 w-7" />
                        <div>No users matched your search.</div>
                    </div>
                )}
            </div>
        </MonitorPanel>
    );
}
