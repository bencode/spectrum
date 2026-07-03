// Structure subsystem — composable static-analysis primitives (nodes + edges per plane).
// Programmatic entry: `@lesscap/spectrum/structure`. Importing this pulls the parser
// (typescript); the CLI (command.ts) imports the planes directly to stay parser-lazy.

export { packageEdges, packages } from './workspace.ts'
export { moduleEdges, modules } from './modules.ts'
export type { ModuleFilter } from './modules.ts'
export { tsParser } from './parser.ts'
export type { ParsedImport, Parser } from './parser.ts'
export type {
  ImportKind,
  Module,
  ModuleEdge,
  Package,
  PackageEdge,
  PackageKind,
} from './types.ts'
