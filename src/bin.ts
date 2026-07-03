#!/usr/bin/env node
// Global `spec` entry — discover the host repo's spectrum config, load it via tsx, run the CLI.
// Run under plain node: the engine's own source uses `.ts` imports node resolves directly; only
// the host config (NodeNext `.js`→`.ts` imports) needs tsx, which we invoke programmatically so
// no global tsx is required on PATH.

import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { tsImport } from 'tsx/esm/api'
import { runSpec } from './cli.ts'
import { repoRoot } from './introspect.ts'
import type { EntityType } from './types.ts'

const CONFIG_NAMES = ['spectrum.config.ts', 'spectrum.config.js', 'spectrum.config.mjs']

// Discover the host's config: a spectrum.config.* at the repo root.
const findConfig = (root: string): string | undefined =>
  CONFIG_NAMES.map(n => join(root, n)).find(existsSync)

const loadCatalog = async (configPath: string): Promise<EntityType[]> => {
  const mod = (await tsImport(pathToFileURL(configPath).href, import.meta.url)) as {
    catalog?: EntityType[]
    default?: EntityType[]
  }
  const catalog = mod.catalog ?? mod.default
  if (!Array.isArray(catalog)) {
    throw new Error(`${configPath} must export \`catalog\` (an EntityType[])`)
  }
  return catalog
}

const root = repoRoot()
const configPath = findConfig(root)
if (!configPath) {
  console.warn(
    `spec: no spectrum.config.ts at repo root (${root})\n` +
      '  add one exporting `catalog: EntityType[]` (see the spectrum-extend skill).\n' +
      '  Running with no entity types.',
  )
}
await runSpec(configPath ? await loadCatalog(configPath) : [], { name: 'spec' })
