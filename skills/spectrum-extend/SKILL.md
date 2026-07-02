---
name: spectrum-extend
description: Use when adding or changing what `spec` (spectrum) can introspect in a host repo — registering a new entity type in the catalog, wiring a collector to a new Prisma/Fastify/services/GitHub surface, promoting a roadmap type to active, or adjusting verify commands and anchors. Edit the host's spectrum.config.ts, not the @lesscap/spectrum engine. Triggers include "make spec show jobs/pages", "add an entity type", "wire a new collector", "spec doesn't list X".
---

# spectrum-extend

Spectrum has two layers. **Never edit `@lesscap/spectrum` (the engine) to add host-specific
introspection** — it is host-agnostic. Edit the host repo's **`spectrum.config.ts`**, which
builds the catalog (`EntityType[]`) by wiring the engine's collector factories to that repo's own
Prisma / Fastify / services.

## The catalog

`spectrum.config.ts` exports `catalog: EntityType[]`. Each entry:

```ts
{
  id: 'model',                 // CLI noun: `spec model …`
  facet: 'dual',               // 'primal' (use-cases) | 'dual' (building blocks)
  name: 'Model',
  concept: 'Prisma persistence entity',
  anchors: ['web-packages/core/prisma/schema.prisma'],   // where it's declared (shown in `spec types`)
  verify: 'pnpm --filter <pkg> exec prisma validate',    // optional, run by `spec model verify`
  ...collector,                // spreads { collect } (and { reconcile } if the factory has one)
}
```

Omit `collect` → the type is a **roadmap** placeholder (listed by `spec types` as `○ roadmap`,
not introspected). Add a `collect` later to promote it.

## Collector factories (`@lesscap/spectrum/collectors`)

Each factory takes the host's own objects/paths and returns `{ collect }` (+ `{ reconcile }`):

- `createPrismaModelCollector({ Prisma, PrismaService, schemaPath, envPath? })` — inject the
  host's `Prisma` namespace + `PrismaService`. `collect` enumerates `Prisma.ModelName`;
  `reconcile` probes the DB (`--live`).
- `createFastifyRouteCollector({ createApp, config, endOf, anchorFor, envPath? })` — inject the
  host's `createApp` + an `AppConfig`. `endOf(path)` groups an endpoint; `anchorFor(path, end)`
  gives its source anchor.
- `createTsServiceCollector({ services, tsconfigPath, servicesFile, srcPrefix, alias? })` — inject
  the runtime `services` registry; the TS type checker reads method signatures off the `alias`
  (default `Services`). `srcPrefix` distinguishes domain code from generated/infra clients.
- `createGithubUseCaseCollector({ label? })` — GitHub issues carrying `label` (default `use-case`).

To introspect a *new* surface (e.g. jobs, pages) with no matching factory, add the entity type
with a hand-written `collect(root) => Resource[]` — reuse the generic harvesters
(`@lesscap/spectrum/harvest`: `loadProject`/`aliasMembers`/`methodsOf` for TS,
`harvestFastifyRoutes` for Fastify) and the read-only helpers (`repoRoot`/`run`/`hasCommand`).

## A `Resource`

```ts
{ type, name, anchor,
  detail?: Record<string,string>,   // flat fields for the list view: status/state/no/method/…
  extra?: Record<string,unknown> }  // structured payload for `show`; list render ignores it
```

`reconcile(declared, root)` returns the declared resources annotated with `detail.status`
(`synced`/`missing`/`drift`/…) — see the renderer's status colors.

## After editing

Run `pnpm --filter <spec-pkg> typecheck`, then `pnpm spec types` (new type appears) and
`pnpm spec <id> list` (resources collect). Keep `spectrum.config.ts` the *only* file that imports
the host's `@…/*` packages.
