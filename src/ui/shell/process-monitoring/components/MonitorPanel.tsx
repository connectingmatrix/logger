import type { ReactNode } from 'react';

interface MonitorPanelProps {
    header?: ReactNode;
    children: ReactNode;
    footer?: ReactNode;
    className?: string;
    bodyClassName?: string;
}

export function MonitorPanel({ header, children, footer, className = '', bodyClassName = '' }: MonitorPanelProps) {
    return (
        <section className={`min-h-0 overflow-hidden rounded-xl border border-border/80 bg-card/95 shadow-sm dark:border-white/10 dark:bg-[#0b1726]/95 dark:shadow-[0_4px_22px_rgba(0,0,0,0.38)] flex flex-col ${className}`}>
            {header}
            <div className={`flex-1 min-h-0 overflow-auto ${bodyClassName}`}>{children}</div>
            {footer}
        </section>
    );
}
