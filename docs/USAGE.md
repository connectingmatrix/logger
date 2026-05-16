# Usage for @connectingmatrix/logger

```ts
import { Logger, LogDecorator as Log } from '@connectingmatrix/logger';
Logger.setup({ level: 'debug', files: { error: './logs/error.jsonl' } });
await Logger.info('package started');
```

See `../README.md` for the full contract list.

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
