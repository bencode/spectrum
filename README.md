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

Then, in the host's `spectrum.config.ts`, build the catalog from the collector factories and run:

```ts
import { createSpecCli } from '@lesscap/spectrum'
import { runMain } from 'citty'
import { catalog } from './spectrum.config.ts'

runMain(createSpecCli(catalog, { name: 'spec', version: '0.1.0' }))
```

CLI grammar:

```
spec list [--live]                 all resources
spec <type> list [--live]          one type
spec <type> show <name> [--live]   one instance
spec <type> verify                 run the type's verify command
spec types                         the metamodel vocabulary
spec skills install [--user] [--copy]
```

Everything is raw TypeScript consumed via `tsx` / `bun` (no build step). A `tsc → dist` build and
an `@lesscap` npm publish come later, once the API stabilizes.
