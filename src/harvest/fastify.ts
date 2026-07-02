// Generic Fastify route harvester — engine side. Given a built & ready app that exposes an
// OpenAPI surface via `swagger()` (as @fastify/swagger adds), read its endpoints into
// descriptors. Typed structurally (no `fastify` import) so the engine stays dependency-light and
// there is no cross-install type mismatch when a host passes its own Fastify app.

export type SwaggerApp = { swagger?: () => { paths?: unknown } }

export type Endpoint = {
  method: string
  path: string
  summary?: string
  tags?: string[]
  parameters?: unknown[]
  requestBody?: unknown
  responses?: Record<string, unknown>
}

type Operation = {
  summary?: string
  tags?: string[]
  parameters?: unknown[]
  requestBody?: unknown
  responses?: Record<string, unknown>
}
type Paths = Record<string, Record<string, Operation>>

const METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options']

// Strip a trailing slash (except root) so `/api/health/` reads as `/api/health`.
const normPath = (p: string): string => (p.length > 1 ? p.replace(/\/+$/, '') : p)

// Read endpoints from app.swagger().paths. Returns [] (with a warning) if swagger is absent
// (e.g. production, where the swagger plugin is not registered).
export const harvestFastifyRoutes = (app: SwaggerApp): Endpoint[] => {
  const swagger = app.swagger
  if (typeof swagger !== 'function') {
    console.warn('  (app exposes no swagger(); cannot harvest routes)')
    return []
  }
  const paths = (swagger().paths ?? {}) as Paths
  return Object.entries(paths).flatMap(([path, ops]) =>
    METHODS.filter(m => ops[m]).map(m => {
      const op = ops[m]
      return {
        method: m.toUpperCase(),
        path: normPath(path),
        summary: op.summary,
        tags: op.tags,
        parameters: op.parameters,
        requestBody: op.requestBody,
        responses: op.responses,
      }
    }),
  )
}
