// spectrum engine entry — the host-agnostic introspection API + CLI builder. A host wires
// its own catalog (built from @lesscap/spectrum/collectors factories) into these.
// Rendering lives here too; collectors and harvesters have their own subpath entries.

export { activeTypes, inspect, inspectOne, verifyType } from './inspect.ts'
export type { InspectOptions, ResourceGroup } from './inspect.ts'
export { createSpecCli, runSpec } from './cli.ts'
export type { SpecCliMeta } from './cli.ts'
export { renderResources, renderTypes } from './render.ts'
export { hasCommand, repoRoot, run } from './introspect.ts'
export type { EntityType, Facet, Resource } from './types.ts'
