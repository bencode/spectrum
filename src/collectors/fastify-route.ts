// route collector (Fastify adapter) — a route is one HTTP endpoint (method + path), the
// unified controller + action surface. Boot the host's real Fastify app (createApp + ready, no
// listen) and harvest endpoints through the generic Fastify+swagger harvester. Booting needs no
// live DB (ready runs no query); a failed boot errors. The host injects createApp + config and
// the path→group / path→anchor mapping; this file imports neither the host nor its config type.

import { join } from 'node:path'
import { type Endpoint, harvestFastifyRoutes, type SwaggerApp } from '../harvest/fastify.ts'
import type { Resource } from '../types.ts'

// Minimal shape the collector needs from a booted app — typed structurally (no `fastify` import)
// so any host's Fastify instance is accepted regardless of which fastify copy typed it.
type BootableApp = SwaggerApp & {
  ready: () => Promise<unknown>
  close: () => Promise<unknown>
}

// "documented" = declares any input/output schema beyond summary/tags (the conformance signal).
const hasResponseBody = (responses?: Record<string, unknown>): boolean =>
  Object.values(responses ?? {}).some(r => typeof r === 'object' && r !== null && 'content' in r)

const defaultDocumented = (ep: Endpoint): boolean =>
  (ep.parameters?.length ?? 0) > 0 || ep.requestBody != null || hasResponseBody(ep.responses)

const contractOf = (ep: Endpoint): Record<string, unknown> => ({
  ...(ep.parameters?.length ? { parameters: ep.parameters } : {}),
  ...(ep.requestBody != null ? { requestBody: ep.requestBody } : {}),
  ...(ep.responses ? { responses: ep.responses } : {}),
})

export type FastifyRouteOptions<TConfig> = {
  createApp: (opts: { config: TConfig }) => BootableApp
  config: TConfig
  endOf: (path: string) => string // classify an endpoint into a group ("end") by its path
  anchorFor: (path: string, end: string) => string // declaration source for an endpoint
  envPath?: string // relative .env loaded before boot (e.g. DATABASE_URL); optional
  isDocumented?: (ep: Endpoint) => boolean
  typeId?: string
}

export const createFastifyRouteCollector = <TConfig>(options: FastifyRouteOptions<TConfig>) => {
  const { createApp, config, endOf, anchorFor, envPath } = options
  const typeId = options.typeId ?? 'route'
  const isDocumented = options.isDocumented ?? defaultDocumented

  const collect = async (root: string): Promise<Resource[]> => {
    if (envPath) {
      try {
        process.loadEnvFile(join(root, envPath)) // DATABASE_URL for client construction
      } catch {
        // env file optional — DATABASE_URL may already be in the environment
      }
    }
    const app = createApp({ config })
    try {
      await app.ready()
      return harvestFastifyRoutes(app).map(ep => {
        const end = endOf(ep.path)
        return {
          type: typeId,
          name: `${ep.method} ${ep.path}`,
          anchor: anchorFor(ep.path, end),
          detail: {
            method: ep.method,
            end,
            ...(ep.summary ? { summary: ep.summary } : {}),
            ...(ep.tags?.length ? { tags: ep.tags.join(',') } : {}),
            status: isDocumented(ep) ? 'documented' : 'bare',
          },
          extra: contractOf(ep),
        }
      })
    } finally {
      await app.close() // release the pg pool, else the CLI process never exits
    }
  }

  return { collect }
}
