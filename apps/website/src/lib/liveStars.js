// Live star data for the browser, fetched once per page and cached per session.
//
// Two sources, because GitHub only lets one of them be read anonymously:
//   • the star *count* comes straight from the public repo endpoint
//   • the star *history* comes from the snapshot CI commits, since the
//     stargazers API rejects unauthenticated reads
//
// Both fail soft — the page already shipped with build-time values baked in.

const REPO = 'quickdrawjs/quickdraw'
const REPO_API = `https://api.github.com/repos/${REPO}`
const SNAPSHOT = `https://raw.githubusercontent.com/${REPO}/main/docs/star-history.json`
const COUNT_KEY = 'qd-star-count'
const HISTORY_KEY = 'qd-star-history'

const json = (url) =>
  fetch(url).then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))

function cached(key, fetcher) {
  let inflight
  return () => {
    if (inflight) return inflight
    try {
      const hit = sessionStorage.getItem(key)
      if (hit) {
        inflight = Promise.resolve(JSON.parse(hit))
        return inflight
      }
    } catch {}
    inflight = fetcher().then((value) => {
      try { sessionStorage.setItem(key, JSON.stringify(value)) } catch {}
      return value
    })
    inflight.catch(() => {})
    return inflight
  }
}

/** @returns {Promise<number>} the current stargazer count. */
export const loadStarCount = cached(COUNT_KEY, () =>
  json(REPO_API).then((repo) => repo.stargazers_count ?? 0),
)

/** @returns {Promise<{stars: number, createdAt: string|null, starredAt: string[]}>} */
export const loadStarHistory = cached(HISTORY_KEY, () =>
  json(SNAPSHOT).then((data) => ({
    stars: data.stars ?? 0,
    createdAt: data.createdAt ?? null,
    starredAt: Array.isArray(data.starredAt) ? data.starredAt : [],
  })),
)
