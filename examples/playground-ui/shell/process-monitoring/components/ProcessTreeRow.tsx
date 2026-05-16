import { ChevronRight } from 'lucide-react';
import { ProcessTypeIcon } from './ProcessTypeIcon';
import { StatusDot } from '../../components/monitoring/StatusDot';
import type { MonitorColumnState, ProcessNode } from '../types';
import { formatBytes, formatPercent } from '../formatters';

interface ProcessTreeRowProps {
    process: ProcessNode;
    level: number;
    hasChildren: boolean;
    expanded: boolean;
    columns: MonitorColumnState['processes'];
    compactRows: boolean;
    onToggle: (processId: string) => void;
}

const statusLabel = {
    running: 'Running',
    sleeping: 'Sleeping',
    stopped: 'Stopped',
    zombie: 'Zombie'
};

export function ProcessTreeRow({ process, level, hasChildren, expanded, columns, compactRows, onToggle }: ProcessTreeRowProps) {
    return (
        <div
            className={`grid grid-cols-[minmax(240px,1fr)_78px_84px_100px_104px] items-center gap-3 border-b border-border/60 px-4 text-xs text-foreground transition-colors hover:bg-primary/10 dark:border-white/10 dark:hover:bg-primary/15 ${
                compactRows ? 'min-h-9 py-1.5' : 'min-h-11 py-2.5'
            }`}
        >
            <div className={`${columns.process ? 'flex' : 'hidden'} min-w-0 items-center gap-2`} style={{ paddingLeft: `${level * 20}px` }}>
                {hasChildren ? (
                    <button
                        type="button"
                        onClick={() => onToggle(process.id)}
                        className="grid h-5 w-5 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                        aria-label={`${expanded ? 'Collapse' : 'Expand'} ${process.name}`}
                    >
                        <ChevronRight className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-90' : ''}`} />
                    </button>
                ) : (
                    <span className="h-5 w-5 shrink-0" />
                )}
                {level > 0 && <span className="h-7 w-px shrink-0 bg-border dark:bg-white/10" aria-hidden="true" />}
                <ProcessTypeIcon process={process} />
                <div className="min-w-0">
                    <div className="truncate font-semibold">{process.name}</div>
                    {process.command && <div className="truncate text-[11px] text-muted-foreground">{process.command}</div>}
                </div>
            </div>
            <div className={`${columns.pid ? '' : 'hidden'} tabular-nums text-muted-foreground`}>{process.pid}</div>
            <div className={`${columns.cpu ? '' : 'hidden'} tabular-nums ${process.cpu >= 5 ? 'text-yellow-500' : 'text-green-600 dark:text-green-400'}`}>{formatPercent(process.cpu)}</div>
            <div className={`${columns.memory ? '' : 'hidden'} tabular-nums text-muted-foreground`}>{formatBytes(process.memoryBytes)}</div>
            <div className={columns.status ? '' : 'hidden'}>
                <StatusDot status={process.status} label={statusLabel[process.status]} />
            </div>
        </div>
    );
}
