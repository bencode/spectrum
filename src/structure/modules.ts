// Module plane — files per package and the import graph between them. Enumeration is
// parser-free (filesystem); edge extraction goes through the Parser seam. Only moduleEdges
// pulls the parser (and thus typescript), lazily — modules() stays dependency-free.

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { builtinModules } from 'node:module'
import { dirname, extname, join, relative, resolve } from 'node:path'
import type { Parser } from './parser.ts'
import type { Module, ModuleEdge } from './types.ts'
import { packages } from './workspace.ts'

export type ModuleFilter = { package?: string }

const SRC_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.mts', '.cts'])
const SKIP_DIR = new Set(['node_modules', 'dist', 'build', 'coverage', '.git', '.claude', '.next', 'generated'])
const BUILTINS = new Set(builtinModules)
// Resolve an ESM specifier (which points at `.js` src) to real files.
const CANDIDATES = ['.ts', '.tsx', '.js', '.jsx', '.mts', '/index.ts', '/index.tsx', '/index.js']

const walk = (dir: string, out: string[]): void => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (!SKIP_DIR.has(e.name)) walk(join(dir, e.name), out)
    } else if (SRC_EXT.has(extname(e.name)) && !e.name.endsWith('.d.ts')) out.push(join(dir, e.name))
  }
}

export const modules = (root: string, filter: ModuleFilter = {}): Module[] =>
  packages(root)
    .filter(p => !filter.package || p.name === filter.package)
    .flatMap(p => {
      const files: string[] = []
      walk(join(root, p.dir), files)
      return files.map(f => ({ path: relative(root, f), package: p.name }))
    })

const isFile = (p: string): boolean => {
  try {
    return statSync(p).isFile()
  } catch {
    return false
  }
}

const resolveRelative = (fromDir: string, spec: string, root: string): string | undefined => {
  const base = resolve(fromDir, spec.replace(/\.[mc]?js$/, ''))
  const hit = [base, ...CANDIDATES.map(c => base + c)].find(isFile)
  return hit ? relative(root, hit) : undefined
}

const matchMember = (spec: string, names: string[]): string | undefined =>
  names.find(n => spec === n || spec.startsWith(`${n}/`))

const resolveEdge = (fromAbs: string, spec: string, root: string, names: string[]): ModuleEdge => {
  const from = relative(root, fromAbs)
  if (spec.startsWith('node:') || BUILTINS.has(spec)) return { from, specifier: spec, kind: 'builtin' }
  if (spec.startsWith('.')) {
    return { from, to: resolveRelative(dirname(fromAbs), spec, root), specifier: spec, kind: 'internal' }
  }
  const member = matchMember(spec, names)
  return member
    ? { from, to: member, specifier: spec, kind: 'cross-package' }
    : { from, specifier: spec, kind: 'external' }
}

const readSource = (p: string): string | null => {
  try {
    return readFileSync(p, 'utf8')
  } catch {
    return null
  }
}

export const moduleEdges = async (
  root: string,
  filter: ModuleFilter = {},
  parser?: Parser,
): Promise<ModuleEdge[]> => {
  const p = parser ?? (await import('./parser.ts')).tsParser()
  const names = packages(root).map(pkg => pkg.name)
  return modules(root, filter).flatMap(m => {
    const abs = join(root, m.path)
    const source = readSource(abs)
    return source === null ? [] : p.imports(source).map(i => resolveEdge(abs, i.specifier, root, names))
  })
}
