// Terminal rendering: a count summary first, then a grouped resource listing.
// Zero deps, lightweight ANSI.

import type { EntityType, Resource } from './types.ts'

const dim = (s: string): string => `\x1b[2m${s}\x1b[0m`
const bold = (s: string): string => `\x1b[1m${s}\x1b[0m`
const green = (s: string): string => `\x1b[32m${s}\x1b[0m`
const red = (s: string): string => `\x1b[31m${s}\x1b[0m`
const yellow = (s: string): string => `\x1b[33m${s}\x1b[0m`

// Reconcile status (set by EntityType.reconcile under --live): synced/missing/drift.
const STATUS_COLOR: Record<string, (s: string) => string> = {
  synced: green,
  missing: red,
  drift: yellow,
  documented: green,
  bare: yellow,
  domain: green,
  infra: dim,
  error: red,
}
const renderStatus = (status?: string): string =>
  status ? ` ${(STATUS_COLOR[status] ?? dim)(`[${status}]`)}` : ''

export const renderResources = (groups: { type: EntityType; resources: Resource[] }[]): string => {
  const total = groups.reduce((n, g) => n + g.resources.length, 0)
  const lines: string[] = [bold(`spectrum · ${total} resources / ${groups.length} types`)]
  for (const g of groups) {
    lines.push('')
    lines.push(`${bold(g.type.id)} ${dim(`(${g.type.facet}) · ${g.resources.length}`)}`)
    for (const r of g.resources) {
      const no = r.detail?.no ? `${r.detail.no} ` : ''
      const state = r.detail?.state ? dim(` [${r.detail.state}]`) : ''
      lines.push(`  ${no}${r.name}${state}${renderStatus(r.detail?.status)}  ${dim(r.anchor)}`)
    }
    if (g.resources.length === 0) lines.push(dim('  (none)'))
  }
  return lines.join('\n')
}

export const renderTypes = (types: EntityType[]): string => {
  const lines: string[] = [bold('spectrum · architectural vocabulary (metamodel)')]
  for (const t of types) {
    const status = t.collect ? green('● active') : dim('○ roadmap')
    lines.push('')
    lines.push(`${bold(t.id)} ${dim(`(${t.facet})`)} ${status}`)
    lines.push(`  ${t.name} — ${t.concept}`)
    lines.push(dim(`  source: ${t.anchors.join(', ')}`))
    if (t.verify) lines.push(dim(`  verify: ${t.verify}`))
  }
  return lines.join('\n')
}
