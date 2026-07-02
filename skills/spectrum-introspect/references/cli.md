# spec CLI + API reference

## CLI grammar

Resource-oriented (noun → verb). Parents show help; only leaves act.

```
spec list [--live]                  all resources across every active type
spec <type> list [--live]           resources of one type
spec <type> show <name> [--live]    one instance (matched by name, or by issue no / #no)
spec <type> verify                  run the type's declared verify command (streams output)
spec types                          the metamodel: id, facet, active/roadmap, source, verify cmd
spec skills install [--user] [--copy]
spec skills list
spec skills uninstall [--user]
```

- `--live` — reconcile against the running system. Only types with a `reconcile` change; others
  are unaffected. Model reconcile opens a DB connection; route collect boots the Fastify app.
- `show` prints JSON. The `extra` field holds the type-specific payload: routes carry their
  OpenAPI contract (parameters / requestBody / responses); services carry `provides` + `methods`
  (param + return signatures).

## When a type returns nothing

- **route** — the app must boot in **non-production** (that's where `@fastify/swagger` registers);
  a missing `DATABASE_URL` can fail the boot. The collector warns and returns `[]` rather than
  throwing.
- **use-case** — needs the `gh` CLI authenticated and the repo to be a GitHub remote with issues
  labeled for the configured label; otherwise warns and returns `[]`.
- **model --live** — if the DB is unreachable it warns and falls back to the declared facet
  (no `[status]`).

## Programmatic API

The CLI is one view; the API returns plain data for any view.

```ts
import { inspect, inspectOne } from '@lesscap/spectrum'
import { catalog } from '<host>/spectrum.config.ts'

const groups = await inspect(catalog, { live: true })      // ResourceGroup[]
const one = await inspectOne(catalog, 'model', 'User')      // Resource | undefined
```

`inspect(catalog, { type?, live?, root? })` → `{ type, resources }[]`. `root` auto-detects the
repo root (walks up for `pnpm-workspace.yaml` / `.git`) when omitted.
