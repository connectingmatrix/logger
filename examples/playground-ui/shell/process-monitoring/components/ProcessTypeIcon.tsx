import { Box, Chrome, Code2, Cpu, Database, Server, ServerCog, Shield, Terminal, Workflow } from 'lucide-react';
import type { ProcessNode } from '../types';

interface ProcessTypeIconProps {
    process: ProcessNode;
}

export function ProcessTypeIcon({ process }: ProcessTypeIconProps) {
    const baseClass = 'h-3.5 w-3.5';
    const type = process.type || 'other';

    const iconMap = {
        system: Shield,
        shell: Terminal,
        node: Workflow,
        database: Database,
        nginx: Server,
        docker: Box,
        python: Cpu,
        browser: Chrome,
        editor: Code2,
        service: ServerCog,
        other: Cpu
    } satisfies Record<NonNullable<ProcessNode['type']>, typeof Cpu>;

    const Icon = iconMap[type];

    return (
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
            <Icon className={baseClass} />
        </span>
    );
}
