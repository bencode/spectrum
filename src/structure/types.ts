// Code-structure data model: nodes and edges across containment planes
// (package → module → symbol). Plain data; the parser seam, renderers, and CLI sit on top.
// The symbol plane (Symbol/signature) is designed but not built in v1.

export type PackageKind = 'app' | 'lib' | 'tool' | 'unknown'

export type Package = {
  name: string
  dir: string // relative to repo root
  kind: PackageKind
  version?: string
  internalDeps: string[] // names of workspace members it depends on
  externalDeps: string[] // npm specifiers
}

export type PackageEdge = { from: string; to: string; dev?: boolean }

export type Module = { path: string; package: string } // path relative to repo root

export type ImportKind = 'internal' | 'cross-package' | 'external' | 'builtin'

export type ModuleEdge = {
  from: string // importing module path
  to?: string // resolved module path (internal) or member name (cross-package); unset for external/builtin
  specifier: string
  kind: ImportKind
}
