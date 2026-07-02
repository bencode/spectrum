// Introspection helpers: read-only — locate the repo and run external commands.
// Never mutates the code being scanned.

import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'

// Walk up from cwd to the monorepo root (pnpm-workspace.yaml or .git).
export const repoRoot = (start: string = process.cwd()): string => {
  let dir = start
  while (dir !== dirname(dir)) {
    if (existsSync(join(dir, 'pnpm-workspace.yaml')) || existsSync(join(dir, '.git'))) return dir
    dir = dirname(dir)
  }
  return start
}

// Run a command and return stdout; return null on failure (never throws).
export const run = (cmd: string, args: string[]): string | null => {
  try {
    return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
  } catch {
    return null
  }
}

export const hasCommand = (cmd: string): boolean =>
  run(process.platform === 'win32' ? 'where' : 'which', [cmd]) !== null
