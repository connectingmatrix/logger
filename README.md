# @connectingmatrix/logger

Decorator/import logger with file output, socket broadcasting, package health registration, and process monitor snapshots.

## Ownership

This package owns its `src/ui`, `src/backend`, `src/entity`, GraphQL bundle, migrations, health/status, launcher, and package contracts. It can be included in backend or UI without assuming a monorepo.

## Public contracts

- `Logger.setup({ files, level, sockets })`
- `Logger.bindSockets(Socket)`
- `Logger.registerPackage(name, healthProbe)`
- `Logger.processMonitorSnapshot()`
- `Logger.trackProcess(id, patch)`
- `@Log / LogDecorator`
- `ProcessMonitor.snapshot()`
- `createPackage() /logger/health /logger/process-monitor`


## Basic usage

```ts
import { Logger, LogDecorator as Log } from '@connectingmatrix/logger';
Logger.setup({ level: 'debug', files: { error: './logs/error.jsonl' } });
await Logger.info('package started');
```

## Server usage

```ts
import { createPackage } from '@connectingmatrix/logger';
const pkg = createPackage();
await pkg.health?.();
// register pkg.routes as middleware and merge pkg.graphql into /graphql
```

## UI usage

Package UI modules expose `bindWithServer('/graphql')` where applicable. Domain packages own their dataloaders; the thin UI only renders/binds.

## Observability and process monitor

All packages expose `PackageObservability`. The server wires logger and sockets into every package. Logger registers package health probes and exposes `/logger/process-monitor` plus `/server/process-monitor`.

## Launcher

Run locally:

```bash
npm run build
node playground.mjs
```

The launcher opens in stub mode so the package can be tested independently, similar to workflow designer stub mode.

## GraphQL and routes

GraphQL namespace and routes are returned by `createPackage()`. Routes include health and launcher endpoints when needed.

## Exports

- `.`
- `./backend`
- `./ui`
- `./entity`
- `./package.json`
- `./browser`
- `./package-structure`
- `./launcher`
- `./observability`

## Folder counts

- `src/ui`: 26 files
- `src/backend`: 21 files
- `src/entity`: 3 files
- `migrations`: 2 files
- `tests`: 3 files



## Final gap closure

See `docs/FINAL_GAP_CLOSURE_CONTRACTS.md` for the final process-monitor, project, node, workflow, and package-owned contract audit.

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

## Final runtime contracts

See `docs/FINAL_RUNTIME_CONTRACTS.md` for the final package-owned API, routes, launcher, observability, and wiring contracts.


## Final package contracts

- `Logger.setup(options)`
- `Logger.info/warn/error/debug/log`
- `LogDecorator / Log`
- `processMonitoring.list(filter?)`
- `processMonitoring.live(handler?)`
- `processMonitoring.logs.live(processId, handler?)`
- `processMonitoring.abort(processId, reason?)`
- `processMonitoring.kill(processId, reason?)`

See `docs/AUTO_GENERATED_CONTRACTS.md` and `docs/OBSERVABILITY.md` for generated operational docs.

## Ninth pass runtime queue/cache closure

Runtime process monitor now exposes package-owned contracts for live runtime status, package observability, and launcher/test mode. Runtime state should come from queues, process monitor, sockets, or explicit package adapters; persisted rows are retained for audit/history only.
