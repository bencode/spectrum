---
name: spectrum-introspect
description: Use when you need to know what a backend actually contains — its Prisma models, HTTP routes, registered services, or use-cases — and whether the live system (database, running app) matches the declared truth. Drives the `spec` CLI (spectrum). Triggers include "what models/routes/services exist", "is the DB in sync", "list the endpoints", "is the schema migrated", "what does this service expose", "introspect the system".
---

# spectrum-introspect

`spec` (from `@lesscap/spectrum`) introspects a system as **resources**. Prefer it over
grepping schema/route/service files by hand — it reads the *runtime* truth (the generated Prisma
client, the booted Fastify app's OpenAPI surface, the services registry via the TS type checker),
and with `--live` it probes the real database.

Run it via the repo's script: **`pnpm spec …`** (both host repos expose a root `spec` script).

## Model

- **Resource** — one concrete instance (a model, an endpoint, a service, a use-case).
- **Entity type** — a kind of resource. Each has a `collect` (declared truth) and maybe a
  `reconcile` (live probe). Types without `collect` are *roadmap* (designed, not yet introspectable).
- **Facet** — `primal` = use-cases users see; `dual` = the architectural building blocks.

## Commands

```
spec types                          the metamodel vocabulary (which types are active vs roadmap)
spec list [--live]                  every resource, grouped by type
spec <type> list [--live]           one type (e.g. spec model list, spec route list)
spec <type> show <name> [--live]    one instance as JSON (full contract/signatures in `extra`)
spec <type> verify                  run that type's declared verify command
spec skills install                 (re)install these skills into .claude/skills
```

`--live` adds a `[status]` per resource by observing the running system. Without it you get the
declared facet only (fast, no DB / no boot).

## Reading status

| status | meaning |
|---|---|
| `synced` | model's table exists and matches (live) |
| `missing` | model declared but table absent — migration not run (`P2021`) |
| `drift` | table exists but columns differ from schema (`P2022`) |
| `documented` / `bare` | route declares an input/output schema, or doesn't |
| `domain` / `infra` | service is project code, or a generated/infra client |
| `open` / `<state:*>` | use-case issue state |

## Typical questions → command

- "What models exist and is the DB migrated?" → `pnpm spec model list --live` (red `[missing]` =
  pending migration).
- "What endpoints does the server expose?" → `pnpm spec route list` (needs the app to boot in
  non-production, where swagger is registered).
- "What does service `$x` provide?" → `pnpm spec service show $x` (method signatures in `extra`).
- "Is the schema valid?" → `pnpm spec model verify`.

See `references/cli.md` for the full grammar and the programmatic API (`inspect`, `inspectOne`).
