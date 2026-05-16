export const PACKAGE_STRUCTURE = {
  "package": "connectingmatrix-logger",
  "structuredAt": "2026-05-15",
  "layout": "package-owned-ui-backend-entity",
  "principle": "The package owns its UI contract, backend runtime contract, entity/CRUD contract, GraphQL extension, migrations, tests, and status surface. giga-ai-backend and giga-ai-ui remain thin composition shells.",
  "entrypoints": {
    "root": "src/index.ts",
    "ui": "src/ui/index.ts",
    "backend": "src/backend/index.ts",
    "entity": "src/entity/index.ts",
    "structure": "src/package-structure.ts"
  },
  "folders": {
    "src/ui": "browser/UI contract: dataloaders, bindWithServer clients, screens, components, socket clients, and designer entry points",
    "src/backend": "server contract: package middleware, GraphQL schema/resolvers, backend services, runtime modules, webhooks/uploads/MCP APIs, and health/status",
    "src/backend/modules": "domain runtime modules owned by this package, grouped by capability instead of legacy app paths",
    "src/entity": "data contract: entities, repositories, access-scoped CRUD, and entity GraphQL support",
    "src/entity/entities": "entity classes and persistent record definitions",
    "src/entity/repositories": "CRUD repositories and persistence adapters",
    "src/entity/graphql": "entity-owned GraphQL contracts/resolvers/schema helpers",
    "migrations": "package-owned database migrations",
    "tests": "unit and integration tests for the package API and compatibility behavior"
  },
  "movesApplied": {
    "backend": [
      [
        "logger",
        "modules/logging"
      ],
      [
        "general",
        "modules/platform"
      ],
      [
        "process-monitoring",
        "modules/monitoring"
      ]
    ],
    "ui": [
      [
        "app/process-monitoring",
        "shell/process-monitoring"
      ]
    ],
    "entity": [
      [
        "repositories/entities",
        "entities"
      ]
    ]
  },
  "counts": {
    "ui": {
      "files": 26,
      "bytes": 102999
    },
    "backend": {
      "files": 21,
      "bytes": 94424
    },
    "entity": {
      "files": 3,
      "bytes": 4737
    },
    "migrations": {
      "files": 2,
      "bytes": 1090
    },
    "tests": {
      "files": 3,
      "bytes": 5013
    }
  }
} as const;

export default PACKAGE_STRUCTURE;
