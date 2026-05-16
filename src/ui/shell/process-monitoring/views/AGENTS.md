# src/app/process-monitoring/views

## Purpose
Route-facing monitor views.

## Rules
- Views wire layout and call monitor hooks/loaders.
- Respect role/scope gates defined by route-access loaders.

## Forbidden
- No direct ORM/socket/GraphQL usage.
