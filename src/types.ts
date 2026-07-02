// spectrum metamodel: describe a system's own entities as resources that can be
// introspected. `facet` expresses the two faces of software: primal = the use-cases
// users see/use; dual = the architectural building blocks that support them.

export type Facet = 'primal' | 'dual'

// A concrete resource instance discovered by introspection.
export type Resource = {
  type: string
  name: string
  anchor: string // points to its declaration source (file path / issue url / ...)
  detail?: Record<string, string> // free-form flat fields for the list view (status/state/no/...)
  extra?: Record<string, unknown> // type-specific structured payload for `show`/web; list render ignores it
}

// Definition of one entity kind (the architectural vocabulary).
// A missing `collect` means roadmap — introspection not implemented yet.
export type EntityType = {
  id: string
  facet: Facet
  name: string
  concept: string
  anchors: string[] // declaration sources
  verify?: string // runnable verification command (for display)
  collect?: (root: string) => Resource[] | Promise<Resource[]> // declared facet: read self-declaration, no infra
  reconcile?: (declared: Resource[], root: string) => Promise<Resource[]> // live facet: observe the running system, annotate detail.status
}
