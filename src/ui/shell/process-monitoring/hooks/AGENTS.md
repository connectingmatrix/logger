# src/app/process-monitoring/hooks

## Purpose
Monitor-specific UI hooks.

## Rules
- Hooks may orchestrate state and call dataloader APIs.
- Use stable keys/dependencies to avoid re-subscription loops.
- Keep socket usage behind dataloader boundaries.

## Forbidden
- No direct backend requests from hooks.
