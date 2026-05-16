# Auto-generated API

```json
{
  "package": "@connectingmatrix/logger",
  "summary": "Decorator/import logger with file output, socket broadcasting, package health registration, and process monitor snapshots.",
  "contracts": [
    "Logger.setup({ files, level, sockets })",
    "Logger.bindSockets(Socket)",
    "Logger.registerPackage(name, healthProbe)",
    "Logger.processMonitorSnapshot()",
    "Logger.trackProcess(id, patch)",
    "@Log / LogDecorator",
    "ProcessMonitor.snapshot()",
    "createPackage() /logger/health /logger/process-monitor"
  ],
  "exports": [
    ".",
    "./backend",
    "./ui",
    "./entity",
    "./package.json",
    "./browser",
    "./package-structure",
    "./launcher",
    "./observability"
  ],
  "folderCounts": {
    "src/ui": 26,
    "src/backend": 21,
    "src/entity": 3,
    "migrations": 2,
    "tests": 3
  },
  "launcher": "playground.mjs",
  "observability": true
}
```

## Eighth pass process monitor contract

`@connectingmatrix/logger` now owns the process-monitoring runtime used by packages and the thin backend.

Public contracts:

```ts
import { processMonitoring, ProcessMonitor, Logger } from '@connectingmatrix/logger';

processMonitoring.list({ kind: 'Projects' });
processMonitoring.live((rows) => console.log(rows));
processMonitoring.logs.live('PROCESS_ID', (logs) => console.log(logs));
await processMonitoring.abort('PROCESS_ID', 'user aborted');
await processMonitoring.kill('PROCESS_ID', 'operator kill');
processMonitoring.heartbeat('PROCESS_ID', { status: 'ok', message: 'alive' });
Logger.trackProcess('PROCESS_ID', { kind: 'Workflows', status: 'running' });
```

Tracked process kinds include `Workflows`, `Ai Agents`, `Swarm`, `Projects`, and `Nodes`. Records include internal PID, CPU/RAM snapshot, status, heartbeat, abort reason, logs, and package ownership metadata.
