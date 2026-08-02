// The sponsor wall's data source — deliberately simple: no tiers, no prices.
//
// The wall feeds itself: .github/workflows/sponsors.yml refreshes
// docs/sponsors.json from the GitHub Sponsors API daily, and this module
// reads that snapshot at build time. New sponsors appear automatically with
// their GitHub avatar and name; lapsed ones roll off.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

export const SPONSOR_URL = 'https://github.com/sponsors/quickdrawjs'

// Hand overrides keyed by GitHub login — e.g. a sponsor who sends a proper
// SVG instead of their avatar: 'acme': { logo: '/sponsors/acme.svg' }
export const OVERRIDES = {}

function readSnapshot() {
  // Resolved from this file so it doesn't matter where the build is invoked.
  const path = fileURLToPath(new URL('../../../../docs/sponsors.json', import.meta.url))
  try {
    const data = JSON.parse(readFileSync(path, 'utf8'))
    return Array.isArray(data.sponsors) ? data.sponsors : []
  } catch {
    // No snapshot yet (fresh clone, or the workflow hasn't run) — the wall
    // just shows its empty state.
    return []
  }
}

// One flat list, most generous first so bigger supporters sit up front.
export function sponsors() {
  return readSnapshot()
    .slice()
    .sort((a, b) => (b.monthly ?? 0) - (a.monthly ?? 0) || (a.since ?? '').localeCompare(b.since ?? ''))
    .map((s) => ({
      name: s.name || s.login,
      url: s.url || `https://github.com/${s.login}`,
      avatar: s.avatar,
      logo: null,
      ...OVERRIDES[s.login],
    }))
}
