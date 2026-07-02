// Generic Fastify route harvester — engine side, depends only on fastify + @fastify/swagger.
// Given a built & ready Fastify app, read its OpenAPI surface into endpoint descriptors.
// Project-agnostic: any Fastify app with @fastify/swagger registered works.

import type { FastifyInstance } from 'fastify'

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
export const harvestFastifyRoutes = (app: FastifyInstance): Endpoint[] => {
  const swagger = (app as unknown as { swagger?: () => { paths?: Paths } }).swagger
  if (typeof swagger !== 'function') {
    console.warn('  (app exposes no swagger(); cannot harvest routes)')
    return []
  }
  const paths = swagger().paths ?? {}
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
