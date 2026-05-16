# AGENTS.md

## Directory Context

- Path: `packages/apps/process-monitoring/src/socket/runtime`
- This folder owns the production code files in this folder.

## Contract

- Keep all code in this folder aligned with its layer package boundary.
- If any production code file in this folder is updated, update this AGENTS.md in the same change.
- This AGENTS file must document each owned file purpose, input/output shape, role rules, logic gates, functions, exports, and line snippets.
- Hybrid ingestion stream rule: runtime socket must emit both `agent:ingestion:progress` and `agent:ingestion:log` while preserving `runtime:event` compatibility.

## File Usage Specification

### `event-bus.ts`
- Purpose: Defines module behavior owned by this usage folder.
- Owning use cases: Runtime and application flows that import this file through package boundaries.
- Input shape: Typed arguments and imported contracts declared in this file signatures.
- Output shape: Typed return values, thrown errors, and exported contracts declared in this file.
- Role interaction rules:
  - `User`: Allowed through explicit service/resolver authorization and scoped data access only.
  - `Root User`: Can execute elevated flows where caller context resolves root privileges.
  - `Super Admin`: Can execute organization-level privileged flows where membership and role gates pass.
- Logic gates summary:
  - Authorization and scope checks must run before read/write side effects.
  - Entity/ORM boundaries must remain the source of persisted data access.
  - MCP or GraphQL proxy boundaries must avoid duplicated domain validation.
- Functions (all):
  - `runtimeUserRoom` (L33-L33, arrow)
  - `runtimeAgentRoom` (L34-L34, arrow)
  - `runtimeSwarmRoom` (L35-L35, arrow)
  - `runtimeSocketRootRoom` (L36-L36, arrow)
  - `runtimeSocketUserRoom` (L37-L37, arrow)
  - `runtimeSocketAgentRoom` (L38-L38, arrow)
  - `runtimeSocketSwarmRoom` (L39-L39, arrow)
  - `setRuntimeSocketServer` (L44-L44, function)
  - `emitSocketRuntime` (L48-L48, function)
  - `emitRuntimeEvent` (L52-L52, function)
- Exports:
  - `runtimeUserRoom` (L33)
  - `runtimeAgentRoom` (L34)
  - `runtimeSwarmRoom` (L35)
  - `runtimeSocketRootRoom` (L36)
  - `runtimeSocketUserRoom` (L37)
  - `runtimeSocketAgentRoom` (L38)
  - `runtimeSocketSwarmRoom` (L39)
  - `setRuntimeSocketServer` (L44)
  - `emitRuntimeEvent` (L52)
- Key snippets and use-case mapping:
  - `L33-L33`: Implements `runtimeUserRoom` for this module use case.
  - `L34-L34`: Implements `runtimeAgentRoom` for this module use case.
  - `L35-L35`: Implements `runtimeSwarmRoom` for this module use case.
  - `L36-L36`: Implements `runtimeSocketRootRoom` for this module use case.
  - `L37-L37`: Implements `runtimeSocketUserRoom` for this module use case.
  - `L38-L38`: Implements `runtimeSocketAgentRoom` for this module use case.
  - `L39-L39`: Implements `runtimeSocketSwarmRoom` for this module use case.
  - `L44-L44`: Implements `setRuntimeSocketServer` for this module use case.
  - `L48-L48`: Implements `emitSocketRuntime` for this module use case.
  - `L52-L52`: Implements `emitRuntimeEvent` for this module use case.
### `runtime.socket.ts`
- Purpose: Defines module behavior owned by this usage folder.
- Owning use cases: Runtime and application flows that import this file through package boundaries.
- Input shape: Typed arguments and imported contracts declared in this file signatures.
- Output shape: Typed return values, thrown errors, and exported contracts declared in this file.
- Role interaction rules:
  - `User`: Allowed through explicit service/resolver authorization and scoped data access only.
  - `Root User`: Can execute elevated flows where caller context resolves root privileges.
  - `Super Admin`: Can execute organization-level privileged flows where membership and role gates pass.
- Logic gates summary:
  - Authorization and scope checks must run before read/write side effects.
  - Entity/ORM boundaries must remain the source of persisted data access.
  - MCP or GraphQL proxy boundaries must avoid duplicated domain validation.
- Functions (all):
  - `setupRuntimeSocketServer` (L36-L36, function)
- Exports:
  - `setupRuntimeSocketServer` (L36)
- Key snippets and use-case mapping:
  - `L36-L36`: Implements `setupRuntimeSocketServer` for this module use case.

## Non-Negotiable Coding Standards

- Never ever write supabase.from we have entities always load data through it
- Do not use `supabase.from` or `input.from` directly. Load data through entities and the ORM.
- Do not add autofills
- Do not add placeholder, do not add normalisation.
- Find and fix the root cause instead of adding the fallback.
- Do not add fallbacks. Fix the logic.
- Everything should be typed dont use unknown, never, any
- Do not use JS-style safe/coercion helper functions.
- Do not use `to*` functions like `toPayload`.
- Do not create map functions.
- Do not check types like `type === Array` or `type === string`.
- Use the `||` operator for comparison.
- Do not write a code file bigger than 70-100 lines.
- Try to generalise multiple lines of code into fewer lines.
- After writing code, recheck patterns across the workspace to remove duplications.
- Do not invent functionality. Ask the user if it already exists somewhere.
- Prefer the smallest correct change over broad refactors.
- Preserve the repo's existing style, structure, and package manager.
- Avoid destructive git commands unless explicitly requested.
- Keep memory entries concise, factual, and tied to the files or behavior that changed.
- Entity table name should come from the Entity and not direct usage.
- Function naming should be .create, .delete .find .update .find .findBy .deleteBy
- Disallowed naming conventions are createRows, listRows and any programatic name for the entity.
- Importing supabase in the entities is disallowed. Upgrade the ORM file is something is not supported by entity. Orm is present at @gigav2/orm
- If Create, Update, Delete, Find is unable to do any thing stop the coding and inform the user of your updates first.
- Do not create proxy or additional functions for create, update, delete
- Keep ORM generic do not add Entity functions in the ORM
- MCP.ts will execute inner graphql for the operations they will not implement any
- JSON is disallowed in the Graphql Schema use proper types only
- Dont use zod for typing
