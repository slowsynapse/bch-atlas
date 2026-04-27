/**
 * Automated project liveness checker.
 *
 * Checks GitHub for recent commits and websites for HTTP 200.
 * Updates status fields in data/projects.json.
 *
 * Usage:
 *   npx tsx scripts/check-project-liveness.ts
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
  [key: string]: unknown
}

const PROJECTS_PATH = resolve(__dirname, '..', 'data', 'projects.json')
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || null
const SIX_MONTHS_MS = 6 * 30 * 24 * 60 * 60 * 1000
const TWO_YEARS_MS = 2 * 365 * 24 * 60 * 60 * 1000

// Rate limiting
const GITHUB_DELAY_MS = GITHUB_TOKEN ? 100 : 1200 // ~60 req/hr unauthenticated
const WEBSITE_DELAY_MS = 500

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Parse GitHub/GitLab owner and repo from a URL.
 * Supports github.com, gitlab.com, codeberg.org
 */
function parseRepoUrl(url: string): { host: string; owner: string; repo: string } | null {
  try {
    const parsed = new URL(url)
    const parts = parsed.pathname.split('/').filter(Boolean)
    if (parts.length < 2) return null

    const host = parsed.hostname
    return { host, owner: parts[0], repo: parts[1] }
  } catch {
    return null
  }
}

/**
 * Check GitHub/GitLab for last commit date.
 */
async function checkGitRepo(url: string): Promise<{ lastCommit: string | null; error?: string }> {
  const repo = parseRepoUrl(url)
  if (!repo) return { lastCommit: null, error: 'Could not parse repo URL' }

  try {
    let apiUrl: string
    let headers: Record<string, string> = {
      'Accept': 'application/json',
      'User-Agent': 'bch-atlas-liveness-checker',
    }

    if (repo.host === 'github.com') {
      apiUrl = `https://api.github.com/repos/${repo.owner}/${repo.repo}/commits?per_page=1`
      if (GITHUB_TOKEN) {
        headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`
      }
    } else if (repo.host === 'gitlab.com') {
      apiUrl = `https://gitlab.com/api/v4/projects/${encodeURIComponent(`${repo.owner}/${repo.repo}`)}/repository/commits?per_page=1`
    } else if (repo.host === 'codeberg.org') {
      apiUrl = `https://codeberg.org/api/v1/repos/${repo.owner}/${repo.repo}/commits?limit=1`
    } else {
      return { lastCommit: null, error: `Unsupported git host: ${repo.host}` }
    }

    const response = await fetch(apiUrl, { headers, signal: AbortSignal.timeout(15000) })

    if (!response.ok) {
      return { lastCommit: null, error: `HTTP ${response.status}` }
    }

    const data = await response.json() as any[]
    if (!data || data.length === 0) {
      return { lastCommit: null, error: 'No commits found' }
    }

    // Different APIs return date in different fields
    let dateStr: string | null = null
    if (repo.host === 'github.com') {
      dateStr = data[0]?.commit?.committer?.date || data[0]?.commit?.author?.date
    } else if (repo.host === 'gitlab.com') {
      dateStr = data[0]?.committed_date || data[0]?.authored_date
    } else if (repo.host === 'codeberg.org') {
      dateStr = data[0]?.commit?.committer?.date || data[0]?.commit?.author?.date
    }

    return { lastCommit: dateStr || null }
  } catch (err: any) {
    return { lastCommit: null, error: err.message || 'Unknown error' }
  }
}

/**
 * Check if a website is up (HTTP 2xx).
 */
async function checkWebsite(url: string): Promise<{ up: boolean; error?: string }> {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: AbortSignal.timeout(10000),
      headers: { 'User-Agent': 'bch-atlas-liveness-checker' },
    })
    // Some sites block HEAD, retry with GET
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
  } catch (err: any) {
    return { up: false, error: err.message || 'Unknown error' }
  }
}

/**
 * Determine project status based on checks.
 */
function determineStatus(
  lastCommit: string | null,
  websiteUp: boolean | null,
  hasGithub: boolean,
  hasWebsite: boolean,
): { status: string; detail: string } {
  const now = Date.now()
  const details: string[] = []

  let commitAge: number | null = null
  if (lastCommit) {
    commitAge = now - new Date(lastCommit).getTime()
    const daysAgo = Math.round(commitAge / (24 * 60 * 60 * 1000))
    details.push(`Last commit ${daysAgo} days ago (${lastCommit.split('T')[0]})`)
  } else if (hasGithub) {
    details.push('GitHub: no commits found or API error')
  }

  if (websiteUp === true) {
    details.push('Website up')
  } else if (websiteUp === false) {
    details.push('Website down')
  }

  // Status rules
  const recentCommit = commitAge !== null && commitAge < SIX_MONTHS_MS
  const oldCommit = commitAge !== null && commitAge >= SIX_MONTHS_MS && commitAge < TWO_YEARS_MS
  const ancientCommit = commitAge !== null && commitAge >= TWO_YEARS_MS

  if (recentCommit || websiteUp === true) {
    return { status: 'active', detail: details.join('. ') }
  }

  if (oldCommit && websiteUp !== true) {
    return { status: 'dormant', detail: details.join('. ') }
  }

  if (ancientCommit && websiteUp !== true) {
    return { status: 'dead', detail: details.join('. ') }
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
  if (GITHUB_TOKEN) {
    console.log('Using GITHUB_TOKEN for authenticated requests')
  } else {
    console.log('No GITHUB_TOKEN — using unauthenticated requests (60/hr limit)')
  }
  console.log('')

  let checked = 0
  let statusChanges = 0

  for (const project of projects) {
    // Skip projects already confirmed dead by manual triage
    // (liveness checker shouldn't resurrect manually-marked dead projects)
    const wasManuallyDead = project.status === 'dead' && project.statusCheckedAt === null

    checked++
    const progress = `[${checked}/${projects.length}]`

    let lastCommit: string | null = null
    let websiteUp: boolean | null = null
    let gitError: string | undefined
    let webError: string | undefined

    // Check GitHub/GitLab
    if (project.github) {
      const result = await checkGitRepo(project.github)
      lastCommit = result.lastCommit
      gitError = result.error
      await sleep(GITHUB_DELAY_MS)
    }

    // Check website
    if (project.website) {
      const result = await checkWebsite(project.website)
      websiteUp = result.up
      webError = result.error
      await sleep(WEBSITE_DELAY_MS)
    }

    // Determine status
    const { status, detail } = determineStatus(
      lastCommit,
      websiteUp,
      !!project.github,
      !!project.website,
    )

    const oldStatus = project.status
    // Don't override manually-set dead status
    if (!wasManuallyDead) {
      project.status = status as any
    }
    project.statusCheckedAt = new Date().toISOString()
    project.statusDetail = detail
    project.lastGithubCommit = lastCommit
    project.websiteUp = websiteUp

    const changed = oldStatus !== project.status
    if (changed) statusChanges++

    const icon = project.status === 'active' ? '  ' : project.status === 'dormant' ? '  ' : project.status === 'dead' ? '  ' : '  '
    const changeNote = changed && !wasManuallyDead ? ` (was: ${oldStatus})` : wasManuallyDead && status !== 'dead' ? ` (kept dead, checker says: ${status})` : ''
    console.log(`${progress} ${icon} ${project.name} — ${project.status}${changeNote}`)

    if (gitError) console.log(`       GitHub error: ${gitError}`)
    if (webError) console.log(`       Website error: ${webError}`)
  }

  // Write back
  writeFileSync(PROJECTS_PATH, JSON.stringify(projects, null, 2) + '\n')

  console.log('')
  console.log(`Done. ${checked} projects checked, ${statusChanges} status changes.`)
  console.log(`Results written to ${PROJECTS_PATH}`)

  // Summary
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
