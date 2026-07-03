// spec CLI builder — one view over the spectrum API (inspect.ts), built with citty.
// A host supplies its catalog; this builds the command tree from it. Resource-oriented
// grammar (noun → verb):
//   spec list [--live]                all resources
//   spec <type> list [--live]         one type
//   spec <type> show <name> [--live]  one instance
//   spec <type> verify                run the type's verify command
//   spec types                        the metamodel vocabulary
//   spec skills install [--user]      install the bundled agent skills
//   spec structure packages|deps|modules|imports [--json]   static code-structure metadata
// Only leaf commands carry `run` — citty executes every `run` along the resolved path, so
// parents stay run-less and resolve to citty's help.

import { defineCommand, runMain } from 'citty'
import { inspect, inspectOne, verifyType } from './inspect.ts'
import { renderResources, renderTypes } from './render.ts'
import { skillsCommand } from './skills/install.ts'
import { structureCommand } from './structure/command.ts'
import type { EntityType } from './types.ts'

const live = { live: { type: 'boolean', description: 'reconcile against the running system' } } as const

const listCmd = (catalog: EntityType[], id?: string) =>
  defineCommand({
    meta: { name: 'list', description: 'list resources' },
    args: live,
    run: async ({ args }) =>
      console.log(renderResources(await inspect(catalog, { type: id, live: Boolean(args.live) }))),
  })

const typeCommand = (catalog: EntityType[], id: string, concept: string) =>
  defineCommand({
    meta: { name: id, description: concept },
    subCommands: {
      list: listCmd(catalog, id),
      show: defineCommand({
        meta: { name: 'show', description: 'show one instance' },
        args: { name: { type: 'positional', required: true }, ...live },
        run: async ({ args }) => {
          const found = await inspectOne(catalog, id, String(args.name), { live: Boolean(args.live) })
          if (found) console.log(JSON.stringify(found, null, 2))
          else {
            console.error(`not found — ${id}: ${args.name}`)
            process.exit(1)
          }
        },
      }),
      verify: defineCommand({
        meta: { name: 'verify', description: 'run the verify command' },
        run: () => {
          if (!verifyType(catalog, id)) process.exit(1)
        },
      }),
    },
  })

export type SpecCliMeta = { name?: string; version?: string; description?: string }

// Build the `spec` citty command tree from a host's catalog.
export const createSpecCli = (catalog: EntityType[], meta: SpecCliMeta = {}) =>
  defineCommand({
    meta: {
      name: meta.name ?? 'spec',
      version: meta.version ?? '0.0.0',
      description: meta.description ?? 'introspect the system as resources',
    },
    subCommands: {
      ...Object.fromEntries(catalog.map(t => [t.id, typeCommand(catalog, t.id, t.concept)])),
      types: defineCommand({
        meta: { name: 'types', description: 'the metamodel vocabulary' },
        run: () => console.log(renderTypes(catalog)),
      }),
      list: listCmd(catalog),
      skills: skillsCommand,
      structure: structureCommand,
    },
  })

// Convenience for a host's thin bin: `runSpec(catalog, { name: 'spec', version })`.
export const runSpec = (catalog: EntityType[], meta?: SpecCliMeta): Promise<void> =>
  runMain(createSpecCli(catalog, meta))
