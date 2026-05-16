import { nowIso } from './contracts.js';
export function createConnectingmatrixLoggerStubLauncher(context = {}) {
    return {
        packageName: '@connectingmatrix/logger',
        title: 'Logger Launcher',
        mode: 'stub',
        status: 'ready',
        checkedAt: nowIso(),
        summary: 'Provides decorator/import logging, file sinks, browser facade, socket broadcasting, pid/cpu/memory telemetry.',
        healthPath: '/logger/health',
        graphqlNamespace: 'logger',
        routes: [
            { method: 'GET', path: '/logger/health', description: 'Health/status endpoint' },
            { method: 'GET', path: '/logger/launcher', description: 'Stub launcher panel' }
        ],
        owns: {
            ui: ['dataloaders', 'bindWithServer', 'status/launcher UI'],
            backend: ["browser logger facade", "process monitor dataloader"],
            entity: ["LogRecord", "ProcessTelemetry"],
            migrations: ['migrations/*.sql']
        },
        actions: [
            { name: 'setup', label: 'setup', method: 'LOCAL', description: 'Run setup demo action' },
            { name: 'info', label: 'info', method: 'LOCAL', description: 'Run info demo action' },
            { name: 'decorator', label: 'decorator', method: 'LOCAL', description: 'Run decorator demo action' }
        ],
        sampleData: { context: 'stub-playground', userId: context.userId ?? 'stub-user' },
        context: { userId: context.userId, organizationId: context.organizationId, root: Boolean(context.root), traceId: context.traceId },
        notes: [
            'This launcher is intentionally stub-mode playable so the package can be tested outside giga-ai-backend.',
            'The launcher exposes this package boundary only; cross-package behavior is injected through adapters.'
        ]
    };
}
export const createStubLauncher = createConnectingmatrixLoggerStubLauncher;
export const Launcher = { open: createConnectingmatrixLoggerStubLauncher, mode: 'stub' };
export const launcher = createConnectingmatrixLoggerStubLauncher;
