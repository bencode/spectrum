// service collector (TS adapter) — a service is a registered capability exposing a typed surface.
// Top-level names come from the host's runtime `services` Record; method signatures come from a
// TS type alias (e.g. `Services`) via the engine's compiler-API harvester (params + returns).
// Infra services (generated clients) are shown shallow; domain services get full sigs. The host
// injects its registry + the TS locations; this file imports neither the host nor its packages.

import { join } from 'node:path'
import { aliasMembers, declaredIn, loadProject, type MethodSig, methodsOf } from '../harvest/ts.ts'
import type { Resource } from '../types.ts'

const relativize = (p: string, root: string): string =>
  p.startsWith(`${root}/`) ? p.slice(root.length + 1) : p

export type TsServiceOptions = {
  services: Record<string, unknown> // runtime registry → authoritative names
  tsconfigPath: string // relative path to the tsconfig that types the services
  servicesFile: string // file-path suffix locating the type alias
  srcPrefix: string // substring marking a domain (project src) decl vs infra/generated
  alias?: string // the type alias name (default: Services)
  typeId?: string
}

export const createTsServiceCollector = (options: TsServiceOptions) => {
  const { services, tsconfigPath, servicesFile, srcPrefix } = options
  const alias = options.alias ?? 'Services'
  const typeId = options.typeId ?? 'service'

  const collect = (root: string): Resource[] => {
    const registered = new Set(Object.keys(services))
    const proj = loadProject(join(root, tsconfigPath))
    return aliasMembers(proj, servicesFile, alias)
      .filter(m => registered.has(m.name))
      .map(m => {
        const declPath = declaredIn(m.type)
        const isDomain = declPath?.includes(srcPrefix) ?? false
        const provides =
          m.type.aliasSymbol?.getName() ??
          m.type.getSymbol()?.getName() ??
          proj.checker.typeToString(m.type)
        const methods: MethodSig[] = isDomain ? methodsOf(proj, m.type) : []
        return {
          type: typeId,
          name: m.name,
          anchor: declPath ? relativize(declPath, root) : servicesFile,
          detail: {
            status: isDomain ? 'domain' : 'infra',
            provides,
            ...(methods.length ? { methods: String(methods.length) } : {}),
          },
          extra: { provides, methods },
        }
      })
  }

  return { collect }
}
