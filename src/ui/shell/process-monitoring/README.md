# Process monitoring module

This folder contains the reusable process-monitoring implementation used by:

- `/dashboard-admin` for the root/admin user view.
- `/process-monitor` for the normal user view.

## Realtime subscription API

The UI renders from `processMonitorRealtime`, a small external-store API. Any service, websocket handler, SSE callback, polling function, or mock can push data into it.

```ts
import { processMonitorRealtime } from './src/app/process-monitoring';

processMonitorRealtime.upsertProcesses([
  {
    id: 'api-worker-1',
    pid: 8844,
    parentId: null,
    name: 'api-worker',
    userId: 'john',
    cpu: 12.4,
    memoryBytes: 180 * 1024 * 1024,
    status: 'running',
    type: 'node',
  },
]);

processMonitorRealtime.appendLogs([
  {
    id: crypto.randomUUID(),
    timestamp: new Date().toLocaleTimeString(),
    processName: 'api-worker',
    pid: 8844,
    userId: 'john',
    level: 'INFO',
    message: 'Realtime process sample received',
  },
]);
```

The same API is also exposed on `window.processMonitorRealtime` for quick browser-console testing.
