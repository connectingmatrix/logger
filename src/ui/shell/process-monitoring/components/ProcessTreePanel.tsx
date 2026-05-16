import { ChevronDown, ChevronRight, Network, Search } from 'lucide-react';
import { MonitorPanel } from './MonitorPanel';
import { ProcessTreeRow } from './ProcessTreeRow';
import { PanelHeader } from '../../components/monitoring/PanelHeader';
import { SearchInput } from '../../components/monitoring/SearchInput';
import { ToolbarButton } from '../../components/monitoring/ToolbarButton';
import { Legend } from '../../components/monitoring/Legend';
import type { MonitorColumnState, ProcessMonitorFilters, ProcessNode, UserMetric } from '../types';

interface ProcessTreePanelProps {
    processes: ProcessNode[];
    users: UserMetric[];
    selectedUserId: string;
    search: string;
    filters: ProcessMonitorFilters;
    columns: MonitorColumnState['processes'];
    expandedProcesses: Set<string>;
    compactRows: boolean;
    onSearchChange: (value: string) => void;
    onToggleProcess: (processId: string) => void;
    onExpandAll: () => void;
    onCollapseAll: () => void;
}

interface ProcessTreeNode {
    process: ProcessNode;
    children: ProcessTreeNode[];
}

function getFilteredProcesses(processes: ProcessNode[], selectedUserId: string, search: string, filters: ProcessMonitorFilters) {
    const query = search.trim().toLowerCase();
    const byId = new Map(processes.map((process) => [process.id, process]));
    const included = new Set<string>();

    processes.forEach((process) => {
        const matchesUser = selectedUserId === 'all' || process.userId === selectedUserId || process.id.startsWith('process-group:');
        const matchesSearch = !query || process.name.toLowerCase().includes(query) || process.command?.toLowerCase().includes(query) || String(process.pid).includes(query) || process.userId.toLowerCase().includes(query);
        const matchesStatus = filters.processStatuses[process.status];
        const matchesCpu = process.cpu >= filters.minCpu || process.id.startsWith('process-group:');
        if (!matchesUser || !matchesSearch || !matchesStatus || !matchesCpu) return;
        included.add(process.id);
        let parentId = process.parentId;
        while (parentId) {
            included.add(parentId);
            parentId = byId.get(parentId)?.parentId || null;
        }
    });

    return processes.filter((process) => included.has(process.id));
}

function buildProcessTree(processes: ProcessNode[]): ProcessTreeNode[] {
    const nodeMap = new Map<string, ProcessTreeNode>();
    processes.forEach((process) => nodeMap.set(process.id, { process, children: [] }));

    const roots: ProcessTreeNode[] = [];
    processes.forEach((process) => {
        const node = nodeMap.get(process.id)!;
        const parent = process.parentId ? nodeMap.get(process.parentId) : undefined;

        if (parent) {
            parent.children.push(node);
        } else {
            roots.push(node);
        }
    });

    return roots.sort((a, b) => a.process.pid - b.process.pid);
}

function flattenTree(nodes: ProcessTreeNode[], expanded: Set<string>, level = 0): Array<{ node: ProcessTreeNode; level: number }> {
    return nodes.flatMap((node) => {
        const current = [{ node, level }];
        if (node.children.length > 0 && expanded.has(node.process.id)) {
            current.push(...flattenTree(node.children, expanded, level + 1));
        }
        return current;
    });
}

export function ProcessTreePanel({ processes, users, selectedUserId, search, filters, columns, expandedProcesses, compactRows, onSearchChange, onToggleProcess, onExpandAll, onCollapseAll }: ProcessTreePanelProps) {
    const selectedUser = users.find((user) => user.id === selectedUserId);
    const filteredProcesses = getFilteredProcesses(processes, selectedUserId, search, filters);
    const tree = buildProcessTree(filteredProcesses);
    const rows = flattenTree(tree, expandedProcesses);
    const subtitle = selectedUserId === 'all' ? 'All process groups' : `${selectedUser?.name ?? selectedUserId} process tree`;

    return (
        <MonitorPanel
            header={
                <PanelHeader
                    title="Process Tree"
                    subtitle={subtitle}
                    actions={
                        <>
                            <SearchInput value={search} onChange={onSearchChange} placeholder="Search processes..." />
                            <ToolbarButton icon={<ChevronDown className="h-4 w-4" />} title="Expand all process branches" onClick={onExpandAll} className="w-9 px-0" />
                            <ToolbarButton icon={<ChevronRight className="h-4 w-4" />} title="Collapse all process branches" onClick={onCollapseAll} className="w-9 px-0" />
                        </>
                    }
                />
            }
            footer={
                <Legend
                    items={[
                        { status: 'running', label: 'Running' },
                        { status: 'sleeping', label: 'Sleeping' },
                        { status: 'high', label: 'High CPU' },
                        { status: 'stopped', label: 'Stopped' },
                        { status: 'zombie', label: 'Zombie' }
                    ]}
                />
            }
        >
            <div className="min-w-[610px]">
                <div className="sticky top-0 z-10 grid grid-cols-[minmax(240px,1fr)_78px_84px_100px_104px] gap-3 border-b border-border/80 bg-background/95 px-4 py-3 text-xs font-semibold text-muted-foreground backdrop-blur dark:border-white/10 dark:bg-[#0b1726]/95">
                    <span className={columns.process ? '' : 'hidden'}>Process Name</span>
                    <span className={columns.pid ? '' : 'hidden'}>PID</span>
                    <span className={columns.cpu ? '' : 'hidden'}>CPU %</span>
                    <span className={columns.memory ? '' : 'hidden'}>Memory</span>
                    <span className={columns.status ? '' : 'hidden'}>Status</span>
                </div>

                {rows.map(({ node, level }) => (
                    <ProcessTreeRow
                        key={node.process.id}
                        process={node.process}
                        level={level}
                        hasChildren={node.children.length > 0}
                        expanded={expandedProcesses.has(node.process.id)}
                        columns={columns}
                        compactRows={compactRows}
                        onToggle={onToggleProcess}
                    />
                ))}

                {rows.length === 0 && (
                    <div className="grid min-h-[340px] place-items-center px-6 py-14 text-center text-muted-foreground">
                        <div>
                            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-border bg-muted/40 dark:border-white/10 dark:bg-white/5">
                                {search || filters.minCpu > 0 ? <Search className="h-7 w-7" /> : <Network className="h-7 w-7" />}
                            </div>
                            <h3 className="text-base font-semibold text-foreground">No process rows to show</h3>
                            <p className="mt-1 max-w-sm text-sm">{selectedUserId === 'all' ? 'Processes will appear here when realtime data arrives.' : 'Try selecting another user or relaxing the process filters.'}</p>
                        </div>
                    </div>
                )}
            </div>
        </MonitorPanel>
    );
}
