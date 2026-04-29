import * as fs from 'fs'
import { createHash } from 'crypto'
import { mapToContinent } from '../src/lib/data/continent-mapper'

// Actual FundMe.cash API response shape
interface FundMeRaw {
  id: string
  name?: string
  owner?: string
  description?: string
  ownersAddress?: string
  status?: string
  isComplete?: boolean
  pledges?: { campaignID: number; pledgeID: number; name: string; message: string; amount: string }[]
  updates?: { number: number; text: string }[]
  logo?: string
  banner?: string
}

interface Campaign {
  id: string
  platform: 'fundme'
  title: string
  description?: string
  continent?: string
  amount: number
  raised?: number
  status: 'success' | 'expired' | 'running' | 'unknown'
  time: string
  url: string
  entities: string[]
  recipientAddresses?: string[]
}

function generateId(url: string, title: string, tx?: string, time?: string): string {
  // Must match the deterministic logic in src/lib/data/campaigns.ts.
  // No Date.now() — fall back to empty string so the id stays stable.
  const unique = tx || time || ''
  return createHash('sha256')
    .update(`${url}-${title}-${unique}`)
    .digest('hex')
    .substring(0, 16)
}

// The cron is allowed to flip status only on these transitions. Anything
// else (success → running, expired → success, etc.) is suspicious and
// gets logged for human review without being applied. Keeping this list
// tight is the single biggest safeguard preventing the cron from
// accidentally rewriting historical archive records.
const ALLOWED_STATUS_TRANSITIONS = new Set<string>([
  'running->success',
  'running->expired',
  'unknown->running',
  'unknown->success',
  'unknown->expired',
])

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function mapStatus(raw: FundMeRaw, raised: number): Campaign['status'] {
  // The API's `status` is authoritative for live state — check it FIRST.
  // A campaign with status='active' is still accepting pledges, even if it
  // already has pledges on it. Previously this function checked raised>=amount
  // before status, but our `amount = raised` heuristic meant any pledged
  // campaign auto-flipped to 'success', erasing 'running' state on refresh.
  const apiStatus = (raw.status || '').toLowerCase()
  if (apiStatus === 'active' || apiStatus === 'running' || apiStatus === 'open') return 'running'

  // isComplete = creator formally claimed funds via FundMe UI. Reliable success.
  if (raw.isComplete) return 'success'

  // Stopped/archived without isComplete: distinguish success from failure by
  // whether anyone pledged. Pledged-and-stopped almost always means the
  // creator wrapped up after receiving funds on-chain.
  if (apiStatus === 'stopped' || apiStatus === 'canceled' || apiStatus === 'cancelled' || apiStatus === 'archived') {
    return raised > 0 ? 'success' : 'expired'
  }

  // Fallback for campaigns with no API status: treat any pledges as success.
  if (raised > 0) return 'success'
  return 'unknown'
}

function sumPledges(pledges?: FundMeRaw['pledges']): number {
  if (!pledges || pledges.length === 0) return 0
  return pledges.reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0)
}

function transformCampaign(raw: FundMeRaw, apiId: string): Campaign {
  const title = raw.name || `FundMe Campaign #${apiId}`
  const url = `https://fundme.cash/?id=${apiId}`
  const time = new Date().toISOString().split('T')[0]
  const raised = sumPledges(raw.pledges)
  const amount = raised > 0 ? raised : 0
  const status = mapStatus(raw, raised)

  const strippedDesc = raw.description ? stripHtml(raw.description) : undefined
  const campaign: Campaign = {
    id: generateId(url, title, undefined, time),
    platform: 'fundme',
    title,
    description: strippedDesc,
    continent: mapToContinent({ title, description: strippedDesc }),
    amount, // FundMe API has no goal field; use raised total
    raised: raised > 0 ? raised : undefined,
    status,
    time,
    url,
    entities: [],
    recipientAddresses: raw.ownersAddress ? [raw.ownersAddress.trim()] : undefined,
  }

  return campaign
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function fetchCampaignList(): Promise<string[]> {
  console.log('Fetching campaign list...')
  const res = await fetch('https://fundme.cash/get-campaignlist')
  if (!res.ok) throw new Error(`Failed to fetch campaign list: ${res.status}`)
  const ids: string[] = await res.json()
  console.log(`Found ${ids.length} campaign IDs`)
  return ids
}

async function fetchCampaign(id: string): Promise<FundMeRaw | null> {
  try {
    const res = await fetch(`https://fundme.cash/get-campaign/${id}`)
    if (!res.ok) {
      console.warn(`  Failed to fetch campaign ${id}: ${res.status}`)
      return null
    }
    return await res.json()
  } catch (err) {
    console.warn(`  Error fetching campaign ${id}:`, err)
    return null
  }
}

async function main() {
  // Load existing campaigns so we can preserve immutable fields (id, time,
  // transactionTimestamp, blockHeight, goal/goalSource) on re-runs. The id is
  // derived from url+title+time, so any drift in `time` would change the id
  // and break campaign URLs and the manual overrides in
  // data/campaign-overrides.json.
  let existing: Record<string, Campaign & Record<string, unknown>> = {}
  try {
    const raw = JSON.parse(fs.readFileSync('data/fundme.json', 'utf-8')) as (Campaign & Record<string, unknown>)[]
    existing = Object.fromEntries(raw.map(c => [c.url, c]))
    console.log(`Loaded ${raw.length} existing campaigns from data/fundme.json`)
  } catch {
    console.log('No existing data/fundme.json — starting fresh')
  }

  const ids = await fetchCampaignList()

  const campaigns: Campaign[] = []
  let failed = 0
  let added = 0
  let statusChanges = 0
  const rejectedTransitions: Array<{ id: string; title: string; from: string; to: string }> = []
  const newCampaigns: Array<{ id: string; title: string }> = []

  for (let i = 0; i < ids.length; i++) {
    const id = ids[i]
    console.log(`Fetching campaign ${i + 1}/${ids.length}: ${id}`)

    const raw = await fetchCampaign(id)
    if (!raw) {
      failed++
      // Preserve existing entry on transient fetch failures
      const url = `https://fundme.cash/?id=${id}`
      const prior = existing[url]
      if (prior) {
        campaigns.push(prior)
        console.log(`  ! fetch failed, kept existing entry`)
      }
      if (i < ids.length - 1) await delay(500)
      continue
    }

    delete raw.logo
    delete raw.banner

    const fresh = transformCampaign(raw, id)
    const url = fresh.url
    const prior = existing[url]

    if (prior) {
      // Archive-mode merge: existing campaigns are append-only EXCEPT for
      // status, and even status only changes on a vetted lifecycle transition.
      // Everything else (title, description, amount, raised, recipientAddresses,
      // continent, time, transactionTimestamp, blockHeight, goal, goalSource)
      // stays exactly as captured. The atlas is primarily an archive — the
      // cron's job is to flip status when a campaign's lifecycle progresses,
      // not to re-edit historical records.
      const transition = `${prior.status}->${fresh.status}`
      const allowed = ALLOWED_STATUS_TRANSITIONS.has(transition)
      const sameStatus = prior.status === fresh.status

      if (sameStatus) {
        campaigns.push(prior)
      } else if (allowed) {
        console.log(`  status: ${prior.status} → ${fresh.status}`)
        statusChanges++
        campaigns.push({ ...prior, status: fresh.status })
      } else {
        // Suspicious transition (e.g. success → running, expired → success).
        // Don't apply, but surface for human review via the cron output.
        console.log(`  ⚠ rejected transition: ${prior.status} → ${fresh.status}  (id=${id}, ${prior.title.slice(0, 50)})`)
        rejectedTransitions.push({ id, title: prior.title, from: prior.status, to: fresh.status })
        campaigns.push(prior)
      }
    } else {
      console.log(`  + new campaign: ${fresh.title.slice(0, 60)}`)
      newCampaigns.push({ id, title: fresh.title })
      campaigns.push(fresh)
      added++
    }

    if (i < ids.length - 1) await delay(500)
  }

  console.log(`\nFetched ${campaigns.length} campaigns (${added} new, ${statusChanges} status changes, ${failed} failed)`)

  if (newCampaigns.length) {
    console.log(`\nNew campaigns added (${newCampaigns.length}):`)
    for (const c of newCampaigns) console.log(`  + id=${c.id}  ${c.title.slice(0, 70)}`)
    console.log(`Tip: run \`npx tsx scripts/backfill-fundme-dates.ts\` to populate transactionTimestamp.`)
  }

  if (rejectedTransitions.length) {
    console.log(`\n⚠ Rejected suspicious status transitions (${rejectedTransitions.length}):`)
    for (const r of rejectedTransitions) {
      console.log(`  id=${r.id}  ${r.from} → ${r.to}  (${r.title.slice(0, 60)})`)
    }
    console.log(`These were NOT applied. Review manually and update if legitimate.`)
  }

  fs.writeFileSync('data/fundme.json', JSON.stringify(campaigns, null, 2) + '\n')
  console.log('Saved to data/fundme.json')
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
