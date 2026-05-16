# src/app/process-monitoring

## Purpose
Process monitor feature shell and composition layer.

## Data Flow
- Screen -> Dataloader -> ORM -> Backend
- Runtime live updates must come through socket dataloaders only.

## Runtime event contract
- Chat execution request state is exposed via `giga:chat-socket` lifecycle events:
  - `chat:request:start`, `chat:request:done`, `chat:request:progress`, `chat:request:error`.
- New monitor implementations should treat those events as execution-state inputs by normalizing them into `RuntimeMonitorEventLog` shape where available.

## Forbidden
- No direct GraphQL/fetch/socket clients in views/components/hooks.
- No mock fallback rows for runtime monitor data.

## Validation
- Run yarn build after monitor changes.
- Run yarn test:dataloaders when monitor loaders or contracts change.
