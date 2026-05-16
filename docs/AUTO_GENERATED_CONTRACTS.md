# Auto-generated contracts for `@connectingmatrix/logger`

This document is generated from the final package audit. The package owns its `src/client`, `src/backend`, `src/entity`, migrations, GraphQL/API surfaces, health/status, launcher, and tests unless this is a thin shell repo.

## Public contracts

- `Logger.setup(options)`
- `Logger.info/warn/error/debug/log`
- `LogDecorator / Log`
- `processMonitoring.list(filter?)`
- `processMonitoring.live(handler?)`
- `processMonitoring.logs.live(processId, handler?)`
- `processMonitoring.abort(processId, reason?)`
- `processMonitoring.kill(processId, reason?)`

## Package use

```ts
import { createPackage } from '@connectingmatrix/logger';
const pkg = createPackage();
await pkg.health?.();
```

## Backend registration

Register `pkg.routes`, merge `pkg.graphql`, run `pkg.migrations`, and keep auth/signature handling delegated to `@connectingmatrix/orm`.

## Frontend binding

UI adapters expose `bindWithServer('/graphql')` or route-specific helpers. Domain logic remains in the owning package.

## Launcher

```bash
npm run build
npm test
node playground.mjs
```
