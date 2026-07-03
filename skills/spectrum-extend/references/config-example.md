# Example host `spectrum.config.ts`

A catalog wiring the four collector factories. Adjust package imports + paths per host (this shape
matches a `@term/*` / `web-packages/server` layout; a `@yimi/*` / `web-packages/web` layout differs
only in the import specifiers and path strings).

```ts
import { Prisma, PrismaService } from '@term/core'
import { createApp, getAppConfig, services } from '@term/server'
import {
  createFastifyRouteCollector,
  createGithubUseCaseCollector,
  createPrismaModelCollector,
  createTsServiceCollector,
} from '@lesscap/spectrum/collectors'
import type { EntityType } from '@lesscap/spectrum'

// route path → group ("end") and → source anchor
const endOf = (p: string): string =>
  p.startsWith('/api/auth') ? 'auth' : p.startsWith('/api/health') ? 'system' : 'system'
const anchorFor = (_p: string, end: string): string => `web-packages/server/src/apps/${end}`

export const catalog: EntityType[] = [
  {
    id: 'use-case',
    facet: 'primal',
    name: 'Use Case',
    concept: 'What the software does for users = a GitHub issue labeled use-case',
    anchors: ['GitHub issues (--label use-case)'],
    ...createGithubUseCaseCollector(),
  },
  {
    id: 'model',
    facet: 'dual',
    name: 'Model',
    concept: 'Prisma persistence entity',
    anchors: ['web-packages/core/prisma/schema.prisma'],
    verify: 'pnpm --filter @term/core exec prisma validate',
    ...createPrismaModelCollector({
      Prisma,
      PrismaService,
      schemaPath: 'web-packages/core/prisma/schema.prisma',
      envPath: 'web-packages/core/.env',
    }),
  },
  {
    id: 'route',
    facet: 'dual',
    name: 'Route',
    concept: 'HTTP endpoint (method + path)',
    anchors: ['web-packages/server/src/apps/*/routes.ts'],
    verify: 'pnpm --filter @term/server test',
    ...createFastifyRouteCollector({
      createApp,
      config: getAppConfig('server'),
      envPath: 'web-packages/core/.env',
      endOf,
      anchorFor,
    }),
  },
  {
    id: 'service',
    facet: 'dual',
    name: 'Service',
    concept: 'Registered capability exposing a typed surface',
    anchors: ['web-packages/server/src/services/index.ts'],
    ...createTsServiceCollector({
      services,
      tsconfigPath: 'web-packages/server/tsconfig.json',
      servicesFile: 'web-packages/server/src/services/index.ts',
      srcPrefix: '/web-packages/server/src/',
    }),
  },
]
```

Export `catalog` from the root `spectrum.config.ts` and you're done — the global `spec` bin (or
`pnpm spec`) discovers and runs it. No per-host CLI bin is needed.
