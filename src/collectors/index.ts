// Collector factories — parameterized adapters a host wires to its own Prisma / Fastify /
// services / GitHub. Each returns { collect } (+ { reconcile } for the Prisma model collector).

export { createFastifyRouteCollector } from './fastify-route.ts'
export type { FastifyRouteOptions } from './fastify-route.ts'
export { createPrismaModelCollector } from './prisma-model.ts'
export type { PrismaModelOptions } from './prisma-model.ts'
export { createGithubUseCaseCollector } from './use-case.ts'
export type { GithubUseCaseOptions } from './use-case.ts'
export { createTsServiceCollector } from './ts-service.ts'
export type { TsServiceOptions } from './ts-service.ts'
