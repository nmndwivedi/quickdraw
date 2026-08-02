// Sponsorship config + the sponsor wall's data source.
//
// The wall feeds itself: .github/workflows/sponsors.yml refreshes
// docs/sponsors.json from the GitHub Sponsors API daily, and this module
// reads that snapshot at build time — new sponsors appear automatically with
// their GitHub avatar, lapsed ones roll off. Nothing here lists prices; the
// tiers and amounts live on the GitHub Sponsors page itself.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

export const SPONSOR_URL = 'https://github.com/sponsors/quickdrawjs'

// Placement levels, highest first. `min` is the monthly amount (in dollars,
// from the API) that reaches the level — used only to sort sponsors into
// rows, never rendered.
export const TIERS = [
  {
    id: 'gold',
    name: 'Gold',
    min: 100,
    hue: '#d97706',
    perks: ['Large logo on the homepage and sponsors page', 'Logo in the README', 'Priority on bug reports'],
  },
  {
    id: 'silver',
    name: 'Silver',
    min: 25,
    hue: '#64748b',
    perks: ['Logo on the homepage and sponsors page', 'Name in the README'],
  },
  {
    id: 'backer',
    name: 'Backer',
    min: 0,
    hue: '#2f6fed',
    perks: ['Name on the sponsors page', 'Our sincere gratitude, forever'],
  },
]

// Hand overrides for auto-pulled sponsors, keyed by GitHub login — e.g. a
// Gold sponsor who sends a proper SVG instead of their avatar:
//   'acme-inc': { logo: '/sponsors/acme.svg', url: 'https://acme.com' }
export const OVERRIDES = {}

// Sponsors who didn't come through GitHub (one-off donations, in-kind
// support): { name, url, tier, logo?, since?, past? }. `past: true` moves an
// entry to the thanks list — nobody who supported the project gets deleted.
export const EXTRA_SPONSORS = []

const EMPTY = { generatedAt: null, sponsors: [] }

function readSnapshot() {
  // Resolved from this file so it doesn't matter where the build is invoked.
  const path = fileURLToPath(new URL('../../../../docs/sponsors.json', import.meta.url))
  try {
    const data = JSON.parse(readFileSync(path, 'utf8'))
    return { generatedAt: data.generatedAt ?? null, sponsors: Array.isArray(data.sponsors) ? data.sponsors : [] }
  } catch {
    // No snapshot yet (fresh clone, or the workflow hasn't run) — the wall
    // just shows its empty state.
    return EMPTY
  }
}

const tierFor = (monthly) =>
  (TIERS.find((t) => (monthly ?? 0) >= t.min) ?? TIERS[TIERS.length - 1]).id

// GitHub-pulled sponsors normalized to the shape the pages render, with any
// hand overrides applied. Avatars stand in for logos until a sponsor sends
// a real one via OVERRIDES.
function autoSponsors() {
  return readSnapshot().sponsors.map((s) => ({
    name: s.name || s.login,
    url: s.url || `https://github.com/${s.login}`,
    tier: tierFor(s.monthly),
    logo: null,
    avatar: s.avatar,
    since: s.since,
    ...OVERRIDES[s.login],
  }))
}

export const activeSponsors = () => [
  ...autoSponsors(),
  ...EXTRA_SPONSORS.filter((s) => !s.past),
]
export const pastSponsors = () => EXTRA_SPONSORS.filter((s) => s.past)
export const byTier = (tierId) => activeSponsors().filter((s) => s.tier === tierId)
