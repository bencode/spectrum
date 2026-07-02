// use-case collector — introspect GitHub issues carrying a label into resources.
// Fully generic: repo is auto-detected from the git remote by `gh`. Parameterize the label.

import { hasCommand, run } from '../introspect.ts'
import type { Resource } from '../types.ts'

type GhIssue = {
  number: number
  title: string
  url: string
  state: string
  labels: { name: string }[]
}

const stateOf = (labels: { name: string }[]): string => {
  const s = labels.find(l => l.name.startsWith('state:'))
  return s ? s.name.slice('state:'.length) : 'open'
}

export type GithubUseCaseOptions = { label?: string; typeId?: string }

export const createGithubUseCaseCollector = (options: GithubUseCaseOptions = {}) => {
  const label = options.label ?? 'use-case'
  const typeId = options.typeId ?? 'use-case'

  const collect = (): Resource[] => {
    if (!hasCommand('gh')) {
      console.warn('  (gh CLI not found, skipping use-case collection)')
      return []
    }
    const out = run('gh', [
      'issue',
      'list',
      '--label',
      label,
      '--state',
      'all',
      '--limit',
      '500',
      '--json',
      'number,title,url,state,labels',
    ])
    if (out === null) {
      console.warn(
        '  (gh issue list failed: not authenticated / offline / non-GitHub repo, skipping)',
      )
      return []
    }
    const issues = JSON.parse(out) as GhIssue[]
    return issues.map(i => ({
      type: typeId,
      name: i.title,
      anchor: i.url,
      detail: { no: `#${i.number}`, state: stateOf(i.labels) },
    }))
  }

  return { collect }
}
