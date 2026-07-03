// `spec structure` — config-free static analysis (no catalog, no host injection). Reads
// only the filesystem, so it works in any repo. Each leaf renders a tree/graph by default
// or emits JSON metadata with --json. Imports the primitives directly (not the barrel) so
// the packages/deps/modules paths never load typescript — only `imports` does, lazily.

import { defineCommand } from 'citty'
import { repoRoot } from '../introspect.ts'
import { moduleEdges, modules } from './modules.ts'
import { renderModuleGraph, renderModules, renderPackageGraph, renderPackages } from './render.ts'
import { packageEdges, packages } from './workspace.ts'

const json = { json: { type: 'boolean', description: 'emit JSON metadata instead of a tree' } } as const
const pkg = { package: { type: 'string', description: 'limit to one package (by name)' } } as const

const emit = (data: unknown, text: string, asJson: unknown): void =>
  console.log(asJson ? JSON.stringify(data, null, 2) : text)

export const structureCommand = defineCommand({
  meta: { name: 'structure', description: 'static code structure — packages, deps, modules, imports' },
  subCommands: {
    packages: defineCommand({
      meta: { name: 'packages', description: 'workspace packages (apps / libs / tools)' },
      args: json,
      run: ({ args }) => {
        const data = packages(repoRoot())
        emit(data, renderPackages(data), args.json)
      },
    }),
    deps: defineCommand({
      meta: { name: 'deps', description: 'internal package dependency graph' },
      args: json,
      run: ({ args }) => {
        const data = packageEdges(repoRoot())
        emit(data, renderPackageGraph(data), args.json)
      },
    }),
    modules: defineCommand({
      meta: { name: 'modules', description: 'source modules, grouped by package' },
      args: { ...pkg, ...json },
      run: ({ args }) => {
        const data = modules(repoRoot(), { package: args.package })
        emit(data, renderModules(data), args.json)
      },
    }),
    imports: defineCommand({
      meta: { name: 'imports', description: 'module import graph' },
      args: { ...pkg, ...json },
      run: async ({ args }) => {
        const data = await moduleEdges(repoRoot(), { package: args.package })
        emit(data, renderModuleGraph(data), args.json)
      },
    }),
  },
})
