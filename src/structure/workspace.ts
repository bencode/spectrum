// Package plane — parser-free. Derives workspace members and their internal dependency
// graph from pnpm-workspace.yaml + each package.json. No host-code injection, no AST.

import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import type { Package, PackageEdge, PackageKind } from './types.ts'

type PkgJson = {
  name?: string
  version?: string
  bin?: unknown
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}
type Member = { pkg: PkgJson; dir: string }

// The quoted glob lines under a top-level `packages:` key (minimal reader, no YAML dep).
const workspaceGlobs = (root: string): string[] => {
  const file = join(root, 'pnpm-workspace.yaml')
  if (!existsSync(file)) return []
  const globs: string[] = []
  let inPackages = false
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    if (/^packages:/.test(line)) inPackages = true
    else if (inPackages && /^\S/.test(line)) break // dedent ends the block
    else if (inPackages) {
      const m = line.match(/^\s*-\s*['"]?([^'"#\s]+)['"]?/)
      if (m) globs.push(m[1])
    }
  }
  return globs
}

// Expand a single-level `prefix/*` glob (or an exact dir) to member directories.
const expandGlob = (root: string, glob: string): string[] => {
  if (!glob.endsWith('/*')) return existsSync(join(root, glob, 'package.json')) ? [glob] : []
  const base = glob.slice(0, -2)
  if (!existsSync(join(root, base))) return []
  return readdirSync(join(root, base), { withFileTypes: true })
    .filter(e => e.isDirectory() && existsSync(join(root, base, e.name, 'package.json')))
    .map(e => `${base}/${e.name}`)
}

// Member dirs; a non-workspace repo (no pnpm-workspace.yaml) counts as one root package.
const memberDirs = (root: string): string[] => {
  const globs = workspaceGlobs(root)
  if (globs.length === 0) return existsSync(join(root, 'package.json')) ? ['.'] : []
  return globs.flatMap(g => expandGlob(root, g))
}

const readMember = (root: string, dir: string): Member | null => {
  try {
    const pkg = JSON.parse(readFileSync(join(root, dir, 'package.json'), 'utf8')) as PkgJson
    return pkg.name ? { pkg, dir } : null
  } catch {
    return null
  }
}

const members = (root: string): Member[] =>
  memberDirs(root)
    .map(d => readMember(root, d))
    .filter((m): m is Member => m !== null)

const depNames = (pkg: PkgJson): string[] => [
  ...new Set([...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.devDependencies ?? {})]),
]

// Structural, repo-agnostic classification: a `bin` marks a tool; a package another member
// depends on is a lib; a standalone member is an app (a top-level entrypoint/consumer).
const classifyKind = (pkg: PkgJson, dependedOn: boolean): PackageKind =>
  pkg.bin ? 'tool' : dependedOn ? 'lib' : 'app'

const toPackage = (m: Member, memberNames: Set<string>, dependedOn: Set<string>): Package => {
  const deps = depNames(m.pkg)
  return {
    name: m.pkg.name as string,
    dir: m.dir,
    kind: classifyKind(m.pkg, dependedOn.has(m.pkg.name as string)),
    version: m.pkg.version,
    internalDeps: deps.filter(d => memberNames.has(d)).sort(),
    externalDeps: deps.filter(d => !memberNames.has(d)).sort(),
  }
}

export const packages = (root: string): Package[] => {
  const ms = members(root)
  const names = new Set(ms.map(m => m.pkg.name as string))
  const dependedOn = new Set(ms.flatMap(m => depNames(m.pkg)).filter(d => names.has(d)))
  return ms.map(m => toPackage(m, names, dependedOn)).sort((a, b) => a.name.localeCompare(b.name))
}

export const packageEdges = (root: string): PackageEdge[] => {
  const ms = members(root)
  const names = new Set(ms.map(m => m.pkg.name as string))
  return ms.flatMap(m => {
    const from = m.pkg.name as string
    const prod = Object.keys(m.pkg.dependencies ?? {}).filter(d => names.has(d))
    const dev = Object.keys(m.pkg.devDependencies ?? {}).filter(d => names.has(d) && !prod.includes(d))
    return [...prod.map(to => ({ from, to })), ...dev.map(to => ({ from, to, dev: true }))]
  })
}
