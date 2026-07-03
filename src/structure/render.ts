// Terminal rendering for the structure planes — trees for nodes, adjacency for edges.
// Self-contained lightweight ANSI (keeps the flat resource renderer in ../render.ts untouched).

import type { ImportKind, Module, ModuleEdge, Package, PackageEdge } from './types.ts'

const dim = (s: string): string => `\x1b[2m${s}\x1b[0m`
const bold = (s: string): string => `\x1b[1m${s}\x1b[0m`
const cyan = (s: string): string => `\x1b[36m${s}\x1b[0m`

const KIND_ORDER: Package['kind'][] = ['app', 'lib', 'tool', 'unknown']
const EDGE_COLOR: Record<ImportKind, (s: string) => string> = {
  internal: dim,
  'cross-package': cyan,
  external: (s: string) => s,
  builtin: dim,
}

// Group items by a key, preserving first-seen order of keys.
const groupBy = <T>(items: T[], key: (t: T) => string): Map<string, T[]> => {
  const out = new Map<string, T[]>()
  for (const it of items) {
    const bucket = out.get(key(it))
    if (bucket) bucket.push(it)
    else out.set(key(it), [it])
  }
  return out
}

export const renderPackages = (pkgs: Package[]): string => {
  const lines = [bold(`spectrum · structure · ${pkgs.length} packages`)]
  for (const kind of KIND_ORDER) {
    const group = pkgs.filter(p => p.kind === kind)
    if (group.length === 0) continue
    lines.push('', bold(kind))
    for (const p of group) {
      const v = p.version ? ` ${p.version}` : ''
      const deps = dim(`(deps: ${p.internalDeps.length} int / ${p.externalDeps.length} ext)`)
      lines.push(`  ${p.name}${dim(v)}  ${dim(p.dir)}  ${deps}`)
    }
  }
  return lines.join('\n')
}

export const renderPackageGraph = (edges: PackageEdge[]): string => {
  const lines = [bold(`spectrum · structure · package graph (${edges.length} edges)`)]
  for (const [from, group] of groupBy(edges, e => e.from)) {
    const tos = group.map(e => (e.dev ? dim(`${e.to} [dev]`) : e.to)).join(', ')
    lines.push(`  ${from} ${dim('→')} ${tos}`)
  }
  return lines.join('\n')
}

export const renderModules = (mods: Module[]): string => {
  const lines = [bold(`spectrum · structure · ${mods.length} modules`)]
  for (const [pkg, group] of groupBy(mods, m => m.package)) {
    lines.push('', `${bold(pkg)} ${dim(`· ${group.length}`)}`)
    for (const m of group) lines.push(`  ${dim(m.path)}`)
  }
  return lines.join('\n')
}

export const renderModuleGraph = (edges: ModuleEdge[]): string => {
  const lines = [bold(`spectrum · structure · import graph (${edges.length} edges)`)]
  for (const [from, group] of groupBy(edges, e => e.from)) {
    lines.push('', from)
    for (const e of group) {
      const target = e.to ?? e.specifier
      lines.push(`  ${dim('→')} ${EDGE_COLOR[e.kind](target)} ${dim(`[${e.kind}]`)}`)
    }
  }
  return lines.join('\n')
}
