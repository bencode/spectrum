// spectrum API — view-agnostic introspection logic. Returns plain data so any view
// (the `spec` CLI, a future web page, an HTTP endpoint) can consume it. No rendering here.
// The catalog (the host's EntityType[]) is passed in, never imported — the engine is
// host-agnostic.

import { execSync } from 'node:child_process'
import { repoRoot } from './introspect.ts'
import type { EntityType, Resource } from './types.ts'

export type ResourceGroup = { type: EntityType; resources: Resource[] }

export type InspectOptions = {
  type?: string // restrict to one entity type id; omit = all introspectable types
  live?: boolean // also reconcile against the running system (annotate detail.status)
  root?: string // repo root; auto-detected when omitted
}

// Types that can be introspected (collect implemented).
export const activeTypes = (catalog: EntityType[]): EntityType[] => catalog.filter(t => t.collect)

// Resolve which entity types to inspect. Throws on unknown / roadmap (no collect) type.
const resolveTypes = (catalog: EntityType[], type?: string): EntityType[] => {
  if (!type) return activeTypes(catalog)
  const t = catalog.find(e => e.id === type)
  if (!t) throw new Error(`unknown type: ${type} (see: spec types)`)
  if (!t.collect) throw new Error(`type ${type} has no introspection yet (roadmap, see: spec types)`)
  return [t]
}

// Declared facet (collect) + optional live facet (reconcile), grouped by entity type.
export const inspect = async (
  catalog: EntityType[],
  options: InspectOptions = {},
): Promise<ResourceGroup[]> => {
  const root = options.root ?? repoRoot()
  return Promise.all(
    resolveTypes(catalog, options.type).map(async t => {
      const declared = t.collect ? await t.collect(root) : []
      const resources = options.live && t.reconcile ? await t.reconcile(declared, root) : declared
      return { type: t, resources }
    }),
  )
}

// One resource instance, matched by name or issue number.
export const inspectOne = async (
  catalog: EntityType[],
  type: string,
  name: string,
  options: Omit<InspectOptions, 'type'> = {},
): Promise<Resource | undefined> => {
  const [group] = await inspect(catalog, { ...options, type })
  return group?.resources.find(
    r => r.name === name || r.detail?.no === name || r.detail?.no === `#${name}`,
  )
}

// Run a type's declared `verify` command (streams output). Returns whether it passed.
export const verifyType = (
  catalog: EntityType[],
  type: string,
  root: string = repoRoot(),
): boolean => {
  const t = catalog.find(e => e.id === type)
  if (!t) throw new Error(`unknown type: ${type} (see: spec types)`)
  if (!t.verify) throw new Error(`type ${type} has no verify command`)
  try {
    execSync(t.verify, { cwd: root, stdio: 'inherit' })
    return true
  } catch {
    return false
  }
}
