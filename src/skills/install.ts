// `spec skills` — install the package's bundled Claude Code skills into a host repo's
// .claude/skills (or the user's ~/.claude/skills), so an agent can operate `spec`.
// Explicit command, never a postinstall hook: writing into a host's .claude/ is opt-in.

import { cpSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, rmSync, symlinkSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineCommand } from 'citty'
import { repoRoot } from '../introspect.ts'

// The package's own bundled skills/ dir (sibling of src/): src/skills/install.ts → ../../skills.
const bundledSkillsDir = (): string => fileURLToPath(new URL('../../skills', import.meta.url))

type SkillInfo = { name: string; description: string; dir: string }

// Read one `key: value` line from a SKILL.md YAML frontmatter (no YAML dep needed).
const frontmatterField = (md: string, key: string): string => {
  const m = md.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'))
  return m ? m[1].trim().replace(/^["']|["']$/g, '') : ''
}

const bundledSkills = (): SkillInfo[] => {
  const base = bundledSkillsDir()
  if (!existsSync(base)) return []
  return readdirSync(base, { withFileTypes: true })
    .filter(e => e.isDirectory())
    .flatMap(e => {
      const skillMd = join(base, e.name, 'SKILL.md')
      if (!existsSync(skillMd)) return []
      const md = readFileSync(skillMd, 'utf8')
      return [
        {
          name: frontmatterField(md, 'name') || e.name,
          description: frontmatterField(md, 'description'),
          dir: join(base, e.name),
        },
      ]
    })
}

const targetDir = (user: boolean): string =>
  join(user ? homedir() : repoRoot(), '.claude', 'skills')

const present = (p: string): boolean => {
  try {
    return existsSync(p) || lstatSync(p).isSymbolicLink()
  } catch {
    return false
  }
}

const installOne = (skill: SkillInfo, dest: string, copy: boolean): void => {
  const to = join(dest, skill.name)
  rmSync(to, { recursive: true, force: true }) // removes a stale dir or symlink; no-op if absent
  if (copy) cpSync(skill.dir, to, { recursive: true })
  else symlinkSync(skill.dir, to, 'dir')
}

const install = defineCommand({
  meta: { name: 'install', description: 'install bundled skills into .claude/skills' },
  args: {
    user: { type: 'boolean', description: 'install into ~/.claude/skills (default: project repo)' },
    copy: { type: 'boolean', description: 'copy files instead of symlinking' },
  },
  run: ({ args }) => {
    const skills = bundledSkills()
    if (skills.length === 0) {
      console.error('no bundled skills found')
      process.exit(1)
    }
    const dest = targetDir(Boolean(args.user))
    mkdirSync(dest, { recursive: true })
    for (const s of skills) installOne(s, dest, Boolean(args.copy))
    console.log(`${args.copy ? 'copied' : 'linked'} ${skills.length} skill(s) → ${dest}`)
    for (const s of skills) console.log(`  ${s.name}`)
  },
})

const list = defineCommand({
  meta: { name: 'list', description: 'list the bundled skills' },
  run: () => {
    const skills = bundledSkills()
    for (const s of skills) console.log(`${s.name} — ${s.description}`)
    if (skills.length === 0) console.log('(none)')
  },
})

const uninstall = defineCommand({
  meta: { name: 'uninstall', description: 'remove bundled skills from .claude/skills' },
  args: { user: { type: 'boolean', description: 'target ~/.claude/skills' } },
  run: ({ args }) => {
    const dest = targetDir(Boolean(args.user))
    let n = 0
    for (const s of bundledSkills()) {
      const to = join(dest, s.name)
      if (present(to)) {
        rmSync(to, { recursive: true, force: true })
        n++
      }
    }
    console.log(`removed ${n} skill(s) from ${dest}`)
  },
})

export const skillsCommand = defineCommand({
  meta: { name: 'skills', description: 'manage the bundled agent skills' },
  subCommands: { install, list, uninstall },
})
