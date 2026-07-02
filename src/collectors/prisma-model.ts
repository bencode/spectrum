// model collector (Prisma adapter) — two facets of the system's persistence entities.
// collect (declared): enumerate models from the generated client's runtime metadata
//   (`Prisma.ModelName` + each model's `<Name>ScalarFieldEnum`). No DB, no parsing.
// reconcile (live): probe the real database through the host's PrismaService — for each declared
//   model attempt findFirst() and classify by Prisma's error code (synced / missing / drift).
// The host injects its own `Prisma` namespace + `PrismaService`; this file imports neither.

import { join } from 'node:path'
import type { Resource } from '../types.ts'

type PrismaClientLike = { $queryRawUnsafe: (q: string) => Promise<unknown> } & Record<string, unknown>
type PrismaBuilt = [PrismaClientLike, () => Promise<void>]

export type PrismaModelOptions = {
  // The generated Prisma namespace; only `.ModelName` (enumerated) and `<Name>ScalarFieldEnum`
  // (read via cast) are used. Typed loosely so any host's generated client is accepted.
  Prisma: { ModelName: object }
  // The host's PrismaService — called as `PrismaService(null)`, returns `[client, stop]`.
  PrismaService: (app: unknown) => unknown
  schemaPath: string // anchor: relative path to schema.prisma
  envPath?: string // relative .env loaded before reconcile (DATABASE_URL); optional
  typeId?: string
}

// Prisma delegate names lower-case only the first char: Store → store.
const lowerFirst = (s: string): string => s.slice(0, 1).toLowerCase() + s.slice(1)

const codeToStatus = (code: unknown): string =>
  code === 'P2021' ? 'missing' : code === 'P2022' ? 'drift' : 'error'

const probe = async (client: PrismaClientLike, name: string): Promise<string> => {
  const delegate = (client as Record<string, { findFirst?: () => Promise<unknown> } | undefined>)[
    lowerFirst(name)
  ]
  if (!delegate?.findFirst) return 'error'
  try {
    await delegate.findFirst()
    return 'synced'
  } catch (e) {
    return codeToStatus((e as { code?: unknown }).code)
  }
}

export const createPrismaModelCollector = (options: PrismaModelOptions) => {
  const { Prisma, PrismaService, schemaPath, envPath } = options
  const typeId = options.typeId ?? 'model'

  const scalarFields = (model: string): string[] => {
    const en = (Prisma as unknown as Record<string, Record<string, string> | undefined>)[
      `${model}ScalarFieldEnum`
    ]
    return en ? Object.keys(en) : []
  }

  const collect = (): Resource[] =>
    Object.keys(Prisma.ModelName).map(name => ({
      type: typeId,
      name,
      anchor: schemaPath,
      detail: { fields: String(scalarFields(name).length) },
    }))

  const reconcile = async (declared: Resource[], root: string): Promise<Resource[]> => {
    if (envPath) {
      try {
        process.loadEnvFile(join(root, envPath))
      } catch {
        // env file optional — PrismaService reads process.env.DATABASE_URL directly
      }
    }
    let built: PrismaBuilt
    try {
      built = PrismaService(null) as PrismaBuilt
    } catch {
      console.warn('  (cannot init prisma client, skipping --live reconcile)')
      return declared
    }
    const [client, stop] = built
    try {
      await client.$queryRawUnsafe('SELECT 1') // force a real round-trip; lazy $connect won't surface a down DB
    } catch {
      console.warn('  (cannot reach database, skipping --live reconcile)')
      await stop().catch(() => {})
      return declared
    }
    try {
      return await Promise.all(
        declared.map(async r => ({ ...r, detail: { ...r.detail, status: await probe(client, r.name) } })),
      )
    } finally {
      await stop()
    }
  }

  return { collect, reconcile }
}
