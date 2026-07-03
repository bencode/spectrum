# @lesscap/spectrum

System self-introspection engine + `spec` CLI builder + bundled agent skills.

Spectrum models a codebase's own entities as **resources** grouped by **entity type**
(model / route / service / use-case / …) across two **facets**: `primal` (the use-cases users
see) and `dual` (the architectural building blocks that support them). Each entity type has a
`collect` (read the declared truth — schema, route table, service registry) and an optional
`reconcile` (probe the live system under `--live`).

This package is **host-agnostic**. It ships:

- an **engine** — the metamodel, view-agnostic inspection logic, a terminal renderer, generic
  harvesters (TS compiler API, Fastify + swagger), and a citty CLI builder;
- **collector factories** — parameterized adapters you wire to your own Prisma / Fastify /
  services (`@lesscap/spectrum/collectors`);
- **bundled skills** — Claude Code skills installed into a host's `.claude/skills/` so an agent
  can operate `spec` (`spec skills install`).

A host project supplies a small `spectrum.config.ts` (its catalog) and a thin bin.

## Layout

```
src/
  index.ts        core barrel: types, inspect, render, createSpecCli, introspect helpers
  types.ts        EntityType, Resource, Facet
  inspect.ts      inspect / inspectOne / verifyType  (take the catalog as an argument)
  render.ts       terminal renderer
  introspect.ts   repoRoot / run / hasCommand
  cli.ts          createSpecCli(catalog, meta?) — builds the citty command tree; adds `spec skills`
  skills/         install command (installs the bundled skills/ into a host's .claude/skills)
  harvest/        generic TS + Fastify harvesters
  collectors/     parameterized collector factories
skills/           bundled Claude Code skills (shipped verbatim; installed by `spec skills install`)
```

## Consume (local link during development)

From a host repo:

```sh
pnpm add link:../spectrum      # or: pnpm link ../spectrum
```

Then add a root `spectrum.config.ts` that builds the catalog from the collector factories and exports
it (see `skills/spectrum-extend/references/config-example.md` for a full example):

```ts
import { createPrismaModelCollector /* … */ } from '@lesscap/spectrum/collectors'
import type { EntityType } from '@lesscap/spectrum'

export const catalog: EntityType[] = [ /* … */ ]
```

Run it with the global `spec` bin (below) or a `"spec": "spec"` script (`pnpm spec …`). CLI grammar:

```
spec list [--live]                 all resources
spec <type> list [--live]          one type
spec <type> show <name> [--live]   one instance
spec <type> verify                 run the type's verify command
spec types                         the metamodel vocabulary
spec skills install [--user] [--copy]
```

## Global `spec` (install once, run in any configured app)

Install the binary once:

```sh
pnpm link --global        # dev; later: npm i -g @lesscap/spectrum
```

Then `spec` works from inside any repo that has a catalog. The global bin (`src/bin.ts`) walks up to
the repo root, loads its `spectrum.config.{ts,js,mjs}` via tsx, and runs the CLI.

The host needs its one root `spectrum.config.ts` (collectors import the app's own code) and
`@lesscap/spectrum` resolvable from it. With no config found, `spec` still runs `spec skills` /
`spec types` (empty) and prints how to add one.

Everything is raw TypeScript consumed via `tsx` / `bun` (no build step). A `tsc → dist` build and
an `@lesscap` npm publish come later, once the API stabilizes.
