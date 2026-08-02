// Sponsorship config — the single source of truth for tiers and the wall.
// Payments run through GitHub Sponsors; if the platform ever changes, this
// URL is the only thing to touch.
export const SPONSOR_URL = 'https://github.com/sponsors/nmndwivedi'

// Highest tier first — every list on the site renders in this order.
export const TIERS = [
  {
    id: 'gold',
    name: 'Gold',
    amount: '$100/mo',
    hue: '#d97706',
    perks: ['Large logo on the homepage and sponsors page', 'Logo in the README', 'Priority on bug reports'],
  },
  {
    id: 'silver',
    name: 'Silver',
    amount: '$25/mo',
    hue: '#64748b',
    perks: ['Logo on the homepage and sponsors page', 'Name in the README'],
  },
  {
    id: 'backer',
    name: 'Backer',
    amount: '$5/mo',
    hue: '#2f6fed',
    perks: ['Name on the sponsors page', 'Our sincere gratitude, forever'],
  },
]

// The sponsor wall. After sponsoring, add yourself here via PR (or open an
// issue and we'll do it): { name, url, tier, logo?, since?, past? }
//   name  — company or person
//   url   — where the logo/name links
//   tier  — 'gold' | 'silver' | 'backer'
//   logo  — optional path under /public/sponsors/ (SVG with transparent
//           background preferred; falls back to a text chip without one)
//   since — 'YYYY-MM', shown on the sponsors page
//   past  — true moves the entry to the "past sponsors" list; we never
//           silently delete anyone who supported the project
export const SPONSORS = []

export const activeSponsors = () => SPONSORS.filter((s) => !s.past)
export const pastSponsors = () => SPONSORS.filter((s) => s.past)
export const byTier = (tierId) => activeSponsors().filter((s) => s.tier === tierId)
