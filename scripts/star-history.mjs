#!/usr/bin/env node
// Regenerates the star-history data and the README charts.
//
// GitHub's stargazers endpoint requires authentication (even for a public
// repo), so this can't run in a visitor's browser. CI runs it on a schedule
// with the Actions token and commits the results:
//
//   docs/star-history.json       consumed by the website (build time + live fetch)
//   docs/star-history.svg        light chart, embedded in the README
//   docs/star-history-dark.svg   dark chart, embedded in the README
//
// Run it yourself with any token that can read public repos:
//
//   GITHUB_TOKEN=<token> node scripts/star-history.mjs

import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { buildStarChart } from '../apps/website/src/lib/starChart.js'
import { renderStarSvg, THEMES, VIEW } from './lib/starSvg.mjs'

const REPO = process.env.STAR_HISTORY_REPO ?? 'quickdrawjs/quickdraw'
const API = `https://api.github.com/repos/${REPO}`
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs')
const PER_PAGE = 100
const MAX_PAGES = 400
const MAX_STAMPS = 3000 // keeps the committed JSON small once the repo takes off

const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN
if (!token) {
  console.error(
    'star-history: GITHUB_TOKEN is required — GitHub rejects anonymous reads of the stargazers API.',
  )
  process.exit(1)
}

async function api(url, accept = 'application/vnd.github+json') {
  const res = await fetch(url, {
    headers: {
      Accept: accept,
      Authorization: `Bearer ${token}`,
      'User-Agent': 'quickdraw-star-history',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${url}`)
  return res.json()
}

async function fetchStarredAt() {
  const stamps = []
  for (let page = 1; page <= MAX_PAGES; page++) {
    const batch = await api(
      `${API}/stargazers?per_page=${PER_PAGE}&page=${page}`,
      'application/vnd.github.star+json',
    )
    if (!Array.isArray(batch) || !batch.length) break
    for (const s of batch) if (s?.starred_at) stamps.push(s.starred_at)
    if (batch.length < PER_PAGE) break
  }
  return stamps.sort()
}

/** Thin a long history down, always keeping the first and last star. */
function thin(stamps) {
  if (stamps.length <= MAX_STAMPS) return stamps
  const stride = Math.ceil(stamps.length / MAX_STAMPS)
  const kept = stamps.filter((_, i) => i % stride === 0)
  if (kept.at(-1) !== stamps.at(-1)) kept.push(stamps.at(-1))
  return kept
}

const repo = await api(API)
const starredAt = thin(await fetchStarredAt())
const generatedAt = new Date().toISOString()

const data = {
  repo: REPO,
  stars: repo.stargazers_count ?? starredAt.length,
  createdAt: repo.created_at ?? null,
  generatedAt,
  starredAt,
}

// `generatedAt` changes on every run, so bail before writing when the numbers
// haven't actually moved — otherwise the nightly job commits a no-op diff.
const jsonPath = join(OUT, 'star-history.json')
let previous = null
try {
  previous = JSON.parse(readFileSync(jsonPath, 'utf8'))
} catch {}

const chartsExist = Object.values(THEMES).every((t) => existsSync(join(OUT, t.file)))
if (
  previous &&
  chartsExist &&
  previous.stars === data.stars &&
  previous.starredAt?.length === starredAt.length &&
  previous.starredAt?.at(-1) === starredAt.at(-1)
) {
  console.log(`star-history: unchanged at ${data.stars} stars — nothing to write`)
  process.exit(0)
}

const chart = buildStarChart(starredAt, {
  createdAt: data.createdAt,
  now: Date.parse(generatedAt),
  total: data.stars,
  view: VIEW,
})

mkdirSync(OUT, { recursive: true })
writeFileSync(jsonPath, `${JSON.stringify(data, null, 2)}\n`)

if (chart) {
  for (const [name, theme] of Object.entries(THEMES)) {
    writeFileSync(join(OUT, theme.file), renderStarSvg(chart, name, { repo: REPO, generatedAt }))
  }
} else {
  console.warn('star-history: no stars yet — wrote the JSON, skipped the charts')
}

console.log(`star-history: ${data.stars} stars, ${starredAt.length} timestamps → docs/`)
