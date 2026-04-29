/**
 * Automated project liveness checker.
 *
 * Layers of signal (cheapest first):
 *   1. GitHub/GitLab/Codeberg last commit date
 *   2. Website HTTP 2xx
 *   3. Wayback Machine "last content change" — catches static donation/marketing
 *      pages that stay up for years after a project dies (e.g. Satoshi Angels).
 *
 * Updates status fields in data/projects.json.
 *
 * Usage:
 *   npx tsx scripts/check-project-liveness.ts
 *   npx tsx scripts/check-project-liveness.ts --skip-wayback
 *
 * Environment:
 *   GITHUB_TOKEN - Optional. Increases GitHub API rate limit from 60/hr to 5000/hr.
 */

import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

interface Project {
  slug: string
  name: string
  github: string | null
  website: string | null
  x: string | null
  status: string
  statusCheckedAt: string | null
  statusDetail: string | null
  lastGithubCommit: string | null
  websiteUp: boolean | null
  lastContentChange: string | null
  waybackCheckedAt: string | null
  [key: string]: unknown
}

const PROJECTS_PATH = resolve(__dirname, '..', 'data', 'projects.json')
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || null
const SKIP_WAYBACK = process.argv.includes('--skip-wayback')
const SLUG_FILTER: string[] = (() => {
  const idx = process.argv.indexOf('--slug')
  if (idx === -1 || !process.argv[idx + 1]) return []
  return process.argv[idx + 1].split(',').map(s => s.trim()).filter(Boolean)
})()

const DAY_MS = 24 * 60 * 60 * 1000
const SIX_MONTHS_MS = 182 * DAY_MS
const TWO_YEARS_MS = 730 * DAY_MS

const GITHUB_DELAY_MS = GITHUB_TOKEN ? 100 : 1200
const WEBSITE_DELAY_MS = 500
const WAYBACK_DELAY_MS = 2500 // CDX is gentle but rate-limits aggressive callers

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}

interface ParsedRepo {
  host: string
  owner: string
  repo: string | null  // null when the URL points at an org/user, not a repo
  fullPath: string | null  // owner/repo with subgroups preserved (GitLab supports nested groups)
}

function parseRepoUrl(url: string): ParsedRepo | null {
  try {
    const parsed = new URL(url)
    const parts = parsed.pathname.split('/').filter(Boolean)
    if (parts.length < 1) return null
    const repo = parts.length >= 2 ? parts[parts.length - 1] : null
    const fullPath = parts.length >= 2 ? parts.join('/') : null
    return {
      host: parsed.hostname,
      owner: parts[0],
      repo,
      fullPath,
    }
  } catch {
    return null
  }
}

/**
 * Resolve an org/user URL to its most recently-pushed repo. Used when the
 * project's `github` field points at a GitHub org root rather than a single
 * repo (e.g. `https://github.com/cashshuffle`). Returns null if no repo can
 * be discovered or the host doesn't support org listing.
 */
async function fetchOrgListing(url: string, headers: Record<string, string>): Promise<{ name: string; pushed_at: string } | null> {
  try {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(15000) })
    if (!res.ok) return null
    const data = await res.json() as Array<{ name?: string; path?: string; pushed_at?: string; last_activity_at?: string; updated_at?: string }>
    if (!Array.isArray(data) || data.length === 0) return null
    const top = data[0]
    const name = top.name || top.path || null
    const pushed = top.pushed_at || top.last_activity_at || top.updated_at || null
    if (!name || !pushed) return null
    return { name, pushed_at: pushed }
  } catch {
    return null
  }
}

async function resolveOrgLatestRepo(repo: ParsedRepo, headers: Record<string, string>): Promise<{ name: string; pushed_at: string } | null> {
  if (repo.host === 'github.com') {
    return fetchOrgListing(
      `https://api.github.com/users/${repo.owner}/repos?sort=pushed&direction=desc&per_page=1`,
      headers,
    )
  }

  if (repo.host === 'gitlab.com') {
    // /users/X works for personal namespaces; /groups/X for org/group
    // namespaces. Try user first, fall back to group.
    const user = await fetchOrgListing(
      `https://gitlab.com/api/v4/users/${encodeURIComponent(repo.owner)}/projects?order_by=last_activity_at&sort=desc&per_page=1`,
      headers,
    )
    if (user) return user
    return fetchOrgListing(
      `https://gitlab.com/api/v4/groups/${encodeURIComponent(repo.owner)}/projects?order_by=last_activity_at&sort=desc&per_page=1`,
      headers,
    )
  }

  if (repo.host === 'codeberg.org' || repo.host.startsWith('git.')) {
    // Forgejo/Gitea: /users/X/repos for users, /orgs/X/repos for orgs
    const user = await fetchOrgListing(
      `https://${repo.host}/api/v1/users/${repo.owner}/repos?limit=1&sort=updated`,
      headers,
    )
    if (user) return user
    return fetchOrgListing(
      `https://${repo.host}/api/v1/orgs/${repo.owner}/repos?limit=1&sort=updated`,
      headers,
    )
  }

  return null
}

async function checkGitRepo(url: string): Promise<{ lastCommit: string | null; error?: string; rateLimited?: boolean; orgFallback?: { repo: string } }> {
  const repo = parseRepoUrl(url)
  if (!repo) return { lastCommit: null, error: 'Could not parse repo URL' }

  try {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'User-Agent': 'bch-atlas-liveness-checker',
    }
    if (repo.host === 'github.com' && GITHUB_TOKEN) {
      headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`
    }

    // Org/user-only URL: list the org's most-recently-pushed repo and report
    // its commit date. This is a *weaker* signal than a curated repo URL —
    // the most-recent repo in the org may be a peripheral utility unrelated
    // to the BCH project the org once shipped. Surfaced via `orgFallback`
    // so the rule engine can downgrade the inferred status accordingly.
    if (!repo.repo) {
      const top = await resolveOrgLatestRepo(repo, headers)
      if (!top) return { lastCommit: null, error: 'Org URL: no public repos' }
      return { lastCommit: top.pushed_at, orgFallback: { repo: top.name } }
    }

    let apiUrl: string
    if (repo.host === 'github.com') {
      apiUrl = `https://api.github.com/repos/${repo.owner}/${repo.repo}/commits?per_page=1`
    } else if (repo.host === 'gitlab.com') {
      // GitLab supports nested subgroups (e.g. group/lib/repo). Use the full
      // URL path, percent-encoded as a single project identifier.
      const projectPath = repo.fullPath || `${repo.owner}/${repo.repo}`
      apiUrl = `https://gitlab.com/api/v4/projects/${encodeURIComponent(projectPath)}/repository/commits?per_page=1`
    } else if (repo.host === 'codeberg.org' || repo.host.startsWith('git.')) {
      // Forgejo/Gitea API. Codeberg is the public instance; self-hosted
      // Forgejo/Gitea instances (typically at git.<domain>) use the same path.
      apiUrl = `https://${repo.host}/api/v1/repos/${repo.owner}/${repo.repo}/commits?limit=1`
    } else {
      return { lastCommit: null, error: `Unsupported git host: ${repo.host}` }
    }

    const response = await fetch(apiUrl, { headers, signal: AbortSignal.timeout(15000) })
    if (!response.ok) {
      const remaining = response.headers.get('x-ratelimit-remaining')
      const isRateLimited = response.status === 403 && remaining === '0'
      return {
        lastCommit: null,
        error: `HTTP ${response.status}${isRateLimited ? ' (rate limited)' : ''}`,
        rateLimited: isRateLimited,
      }
    }

    const data = await response.json() as Array<{ commit?: { committer?: { date?: string }; author?: { date?: string } }; committed_date?: string; authored_date?: string }>
    if (!data || data.length === 0) return { lastCommit: null, error: 'No commits found' }

    let dateStr: string | null = null
    if (repo.host === 'gitlab.com') {
      dateStr = data[0]?.committed_date || data[0]?.authored_date || null
    } else {
      // GitHub + Forgejo/Gitea (Codeberg + self-hosted) share the same shape.
      dateStr = data[0]?.commit?.committer?.date || data[0]?.commit?.author?.date || null
    }

    return { lastCommit: dateStr }
  } catch (err) {
    return { lastCommit: null, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

async function checkWebsite(url: string): Promise<{ up: boolean; error?: string }> {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: AbortSignal.timeout(10000),
      headers: { 'User-Agent': 'bch-atlas-liveness-checker' },
    })
    if (response.status === 405 || response.status === 403) {
      const getResponse = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        signal: AbortSignal.timeout(10000),
        headers: { 'User-Agent': 'bch-atlas-liveness-checker' },
      })
      return { up: getResponse.ok }
    }
    return { up: response.ok }
  } catch (err) {
    return { up: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

/**
 * Wayback Machine staleness check.
 *
 * Algorithm — "old-digest match ratio":
 *   1. Pull every 200-status capture from Wayback CDX with content digest (SHA1).
 *   2. Build a set of digests seen 2+ years ago (the "old" fingerprint set).
 *   3. Look at captures from the last 6 months. If most of them match an old
 *      digest, the page hasn't meaningfully changed — site is in stasis.
 *   4. Otherwise the page changed within the last 2 years.
 *
 * Why not just walk snapshots? Many BCH project pages have dynamic weight
 * (counters, embedded social, donation totals) that breaks naive
 * "same-digest-since-X" reasoning. The match-ratio approach tolerates noise
 * because old donation counters still produce digests that survive into the
 * present — what we're really checking is "has the *page concept* shifted".
 *
 * Caveats:
 *   - Sites blocking archiving (robots/opt-out) → empty CDX → null result.
 *   - Sites with very few recent captures (<3) → low confidence, return null.
 *   - Highly dynamic dead sites (e.g. donation page with live counter) can
 *     evade detection. Manual curation handles those.
 *
 * Returns ISO timestamp of last estimated content change, or null on
 * insufficient/inconclusive data.
 */
const TWO_YEAR_LOOKBACK_DAYS = 730
const RECENT_WINDOW_DAYS = 182
const MIN_RECENT_CAPTURES = 3
const STALE_MATCH_THRESHOLD = 0.5

type WaybackVerdict = 'stale' | 'fresh' | 'inconclusive' | 'error'

// Hosts known to throttle/truncate Wayback histories. CDX returns only old
// snapshots, which our staleness rule then misreads as "abandoned". Skip
// Wayback entirely for these — rely on website-up + GitHub signal instead.
const WAYBACK_BLOCKED_HOSTS = [
  'reddit.com',
  'twitter.com',
  'x.com',
  't.me',
  'telegram.me',
  'news.bitcoin.com',
]

function isWaybackBlocked(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase()
    return WAYBACK_BLOCKED_HOSTS.some(b => host === b || host.endsWith('.' + b))
  } catch {
    return false
  }
}

async function checkWayback(url: string): Promise<{ lastChange: string | null; error?: string; snapshotCount: number; verdict: WaybackVerdict }> {
  if (isWaybackBlocked(url)) {
    return { lastChange: null, snapshotCount: 0, verdict: 'inconclusive', error: 'Host blocks deep archiving' }
  }
  try {
    const cdxUrl = `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(url)}&output=json&fl=timestamp,digest,statuscode&filter=statuscode:200&from=20180101&limit=500`
    const response = await fetch(cdxUrl, {
      signal: AbortSignal.timeout(60000),
      headers: { 'User-Agent': 'bch-atlas-liveness-checker' },
    })
    if (!response.ok) return { lastChange: null, error: `HTTP ${response.status}`, snapshotCount: 0, verdict: 'error' }

    const data = await response.json() as string[][]
    if (!data || data.length <= 1) return { lastChange: null, snapshotCount: 0, verdict: 'inconclusive' }

    const rows = data.slice(1) // [timestamp, digest, statuscode]
    if (rows.length === 0) return { lastChange: null, snapshotCount: 0, verdict: 'inconclusive' }

    const now = Date.now()
    const oldCutoff = now - TWO_YEAR_LOOKBACK_DAYS * DAY_MS
    const recentCutoff = now - RECENT_WINDOW_DAYS * DAY_MS

    // Parse Wayback YYYYMMDDhhmmss timestamps
    const parsed = rows.map(([ts, digest]) => {
      const m = ts.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/)
      if (!m) return null
      const date = Date.parse(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z`)
      return { ts, digest, date }
    }).filter((x): x is { ts: string; digest: string; date: number } => x !== null)

    if (parsed.length === 0) return { lastChange: null, snapshotCount: rows.length, verdict: 'inconclusive' }

    const oldDigests = new Set(parsed.filter(p => p.date < oldCutoff).map(p => p.digest))
    const recent = parsed.filter(p => p.date >= recentCutoff)
    const newest = parsed[parsed.length - 1]

    // Need both old fingerprint AND enough recent captures to draw a conclusion
    if (oldDigests.size === 0 || recent.length < MIN_RECENT_CAPTURES) {
      const newestDigest = newest.digest
      const firstNewest = parsed.find(p => p.digest === newestDigest)
      const ts = firstNewest?.ts || newest.ts
      const m = ts.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/)
      return {
        lastChange: m ? `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z` : null,
        snapshotCount: rows.length,
        verdict: 'inconclusive',
      }
    }

    const recentMatchingOld = recent.filter(p => oldDigests.has(p.digest)).length
    const matchRatio = recentMatchingOld / recent.length
    const isStale = matchRatio >= STALE_MATCH_THRESHOLD
    const verdict: WaybackVerdict = isStale ? 'stale' : 'fresh'

    // For "lastChange" date: if stale, use the youngest old-cutoff timestamp
    // (i.e. ~2 years ago — the page has been the same since then). If not
    // stale, find the most recent capture whose digest is NOT in oldDigests
    // (the latest "new" content) and use the prior capture as the change point.
    let lastChangeTs: string
    if (isStale) {
      // Most recent capture before the 2yr cutoff sets the "stable since" date
      const lastOld = parsed.filter(p => p.date < oldCutoff).pop()
      lastChangeTs = lastOld?.ts || parsed[0].ts
    } else {
      // Walk newest→oldest, find first capture matching an old digest — that's
      // when novelty stopped. Otherwise use newest as proxy.
      const reversed = [...parsed].reverse()
      const found = reversed.find(p => oldDigests.has(p.digest))
      lastChangeTs = found?.ts || newest.ts
    }

    const m = lastChangeTs.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/)
    if (!m) return { lastChange: null, snapshotCount: rows.length, verdict }
    return {
      lastChange: `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z`,
      snapshotCount: rows.length,
      verdict,
    }
  } catch (err) {
    return { lastChange: null, error: err instanceof Error ? err.message : 'Unknown error', snapshotCount: 0, verdict: 'error' }
  }
}

function determineStatus(
  lastCommit: string | null,
  websiteUp: boolean | null,
  waybackVerdict: WaybackVerdict,
  lastContentChange: string | null,
  hasGithub: boolean,
  hasWebsite: boolean,
  prevStatus: string,
  orgFallback?: { repo: string },
): { status: string; detail: string } {
  const now = Date.now()
  const details: string[] = []

  let commitAge: number | null = null
  if (lastCommit) {
    commitAge = now - new Date(lastCommit).getTime()
    const daysAgo = Math.round(commitAge / DAY_MS)
    if (orgFallback) {
      details.push(`Org-only URL — most-recent repo "${orgFallback.repo}" pushed ${daysAgo}d ago`)
    } else {
      details.push(`Last commit ${daysAgo}d ago`)
    }
  } else if (hasGithub) {
    details.push('GitHub: no commits found')
  }

  if (websiteUp === true) details.push('Website up')
  else if (websiteUp === false) details.push('Website down')
  if (waybackVerdict === 'stale') details.push('Page unchanged 2yr+ (Wayback)')
  else if (waybackVerdict === 'error') details.push('Wayback check failed')
  else if (waybackVerdict === 'inconclusive' && hasWebsite) details.push('Wayback inconclusive')

  // Org-fallback commits are a *weak* signal — the discovered repo may be
  // unrelated to the project the org once shipped. Treat the commit as if
  // it were missing for "alive" rules; still record it so reviewers see
  // the date in the detail string. It can still confirm "ancient" status.
  const trustCommitForActive = commitAge !== null && !orgFallback
  const recentCommit = trustCommitForActive && commitAge < SIX_MONTHS_MS
  const oldCommit = trustCommitForActive && commitAge >= SIX_MONTHS_MS && commitAge < TWO_YEARS_MS
  const ancientCommit = commitAge !== null && commitAge >= TWO_YEARS_MS

  // When Wayback gave us "inconclusive" (too few recent captures), the
  // returned lastContentChange is the timestamp of the newest capture itself.
  // If even that newest capture is >2yr old, the page hasn't been archived
  // recently — strong signal of abandonment. Only applies to `inconclusive`,
  // because for `fresh`/`stale` the timestamp means something different.
  let inferredStaleFromAge = false
  if (lastContentChange && waybackVerdict === 'inconclusive') {
    const contentAge = now - new Date(lastContentChange).getTime()
    if (contentAge >= TWO_YEARS_MS) {
      inferredStaleFromAge = true
      details.push(`Newest Wayback capture ${Math.round(contentAge / DAY_MS)}d old`)
    }
  }

  // Wayback says "stale" — page hasn't changed in 2+ years. Trumps live website.
  if ((waybackVerdict === 'stale' || inferredStaleFromAge) && !recentCommit) {
    return { status: 'dead', detail: details.join('. ') }
  }

  if (recentCommit) {
    return { status: 'active', detail: details.join('. ') }
  }

  // Live website. Be conservative about resurrecting dead/dormant:
  //   - Wayback fresh: trust the upgrade to active (positive signal of recent change)
  //   - Wayback error or inconclusive: preserve prior dead/dormant status
  if (websiteUp === true) {
    if (waybackVerdict === 'fresh') {
      return { status: 'active', detail: details.join('. ') }
    }
    if (prevStatus === 'dead' || prevStatus === 'dormant') {
      return { status: prevStatus, detail: `${details.join('. ')}. Preserved prior status (no fresh signal).` }
    }
    return { status: 'active', detail: details.join('. ') }
  }

  if (ancientCommit) {
    return { status: 'dead', detail: details.join('. ') }
  }
  if (oldCommit) {
    return { status: 'dormant', detail: details.join('. ') }
  }

  if (!hasGithub && !hasWebsite) {
    return { status: 'unknown', detail: 'No GitHub or website configured' }
  }
  return { status: 'unknown', detail: details.join('. ') || 'All checks inconclusive' }
}

async function main() {
  const raw = readFileSync(PROJECTS_PATH, 'utf-8')
  const projects: Project[] = JSON.parse(raw)

  console.log(`Checking liveness for ${projects.length} projects...`)
  console.log(GITHUB_TOKEN ? 'Using GITHUB_TOKEN for authenticated requests' : 'No GITHUB_TOKEN — 60 req/hr limit')
  console.log(SKIP_WAYBACK ? 'Skipping Wayback Machine checks (--skip-wayback)' : 'Wayback Machine checks ENABLED')
  console.log('')

  let checked = 0
  let statusChanges = 0

  for (const project of projects) {
    if (SLUG_FILTER.length && !SLUG_FILTER.includes(project.slug as string)) continue
    const wasManuallyDead = project.status === 'dead' && project.statusCheckedAt === null

    checked++
    const progress = `[${checked}/${projects.length}]`

    let lastCommit: string | null = null
    let websiteUp: boolean | null = null
    let lastContentChange: string | null = null
    let waybackSnapshots = 0
    let waybackVerdict: WaybackVerdict = 'inconclusive'
    let gitError: string | undefined
    let webError: string | undefined
    let wayError: string | undefined
    let orgFallback: { repo: string } | undefined

    let gitRateLimited = false
    if (project.github) {
      const result = await checkGitRepo(project.github)
      lastCommit = result.lastCommit
      gitError = result.error
      orgFallback = result.orgFallback
      gitRateLimited = result.rateLimited === true
      // On rate-limit, fall back to prior known commit so we don't lose info
      if (gitRateLimited && project.lastGithubCommit) {
        lastCommit = project.lastGithubCommit
      }
      await sleep(GITHUB_DELAY_MS)
    }

    if (project.website) {
      const result = await checkWebsite(project.website)
      websiteUp = result.up
      webError = result.error
      await sleep(WEBSITE_DELAY_MS)
    }

    // Only run Wayback if we have a website AND need extra signal:
    //   - no GitHub, OR
    //   - GitHub commit is old/missing (so we need to confirm dead-vs-dormant)
    const commitAge = lastCommit ? Date.now() - new Date(lastCommit).getTime() : null
    const needWayback = !SKIP_WAYBACK && project.website && websiteUp === true && (
      !project.github || commitAge === null || commitAge >= SIX_MONTHS_MS
    )

    if (needWayback) {
      const result = await checkWayback(project.website!)
      lastContentChange = result.lastChange
      waybackSnapshots = result.snapshotCount
      waybackVerdict = result.verdict
      wayError = result.error
      project.waybackCheckedAt = new Date().toISOString()
      await sleep(WAYBACK_DELAY_MS)
    }

    const { status, detail } = determineStatus(
      lastCommit,
      websiteUp,
      waybackVerdict,
      lastContentChange,
      !!project.github,
      !!project.website,
      project.status,
      orgFallback,
    )

    const oldStatus = project.status
    if (!wasManuallyDead) project.status = status as Project['status']
    project.statusCheckedAt = new Date().toISOString()
    project.statusDetail = detail
    // Preserve prior commit on rate-limit; otherwise overwrite with fresh result
    if (!gitRateLimited) {
      project.lastGithubCommit = lastCommit
    }
    project.websiteUp = websiteUp
    if (lastContentChange !== null) project.lastContentChange = lastContentChange

    const changed = oldStatus !== project.status
    if (changed) statusChanges++

    const wayInfo = needWayback ? ` [wayback: ${waybackSnapshots} snaps, ${waybackVerdict}${lastContentChange ? `, last ${lastContentChange.split('T')[0]}` : ''}]` : ''
    const changeNote = changed && !wasManuallyDead
      ? ` (was: ${oldStatus})`
      : wasManuallyDead && status !== 'dead'
        ? ` (kept dead, checker says: ${status})`
        : ''
    console.log(`${progress} ${project.name} — ${project.status}${changeNote}${wayInfo}`)

    if (gitError) console.log(`       GitHub error: ${gitError}`)
    if (webError) console.log(`       Website error: ${webError}`)
    if (wayError) console.log(`       Wayback error: ${wayError}`)
  }

  writeFileSync(PROJECTS_PATH, JSON.stringify(projects, null, 2) + '\n')

  console.log('')
  console.log(`Done. ${checked} projects checked, ${statusChanges} status changes.`)
  console.log(`Results written to ${PROJECTS_PATH}`)

  const summary: Record<string, number> = {}
  projects.forEach(p => { summary[p.status] = (summary[p.status] || 0) + 1 })
  console.log('Status breakdown:')
  Object.entries(summary).sort((a, b) => b[1] - a[1]).forEach(([s, n]) => {
    console.log(`  ${s}: ${n}`)
  })
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
