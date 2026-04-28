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
  const unique = tx || time || Date.now().toString()
  return createHash('sha256')
    .update(`${url}-${title}-${unique}`)
    .digest('hex')
    .substring(0, 16)
}

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
      // Preserve identity-defining and historical fields. Only overlay mutable
      // fields (status, raised, amount, description) from the fresh fetch.
      const merged: Campaign & Record<string, unknown> = {
        ...prior,
        title: fresh.title,
        description: fresh.description,
        continent: fresh.continent,
        amount: fresh.amount,
        raised: fresh.raised,
        status: fresh.status,
        recipientAddresses: fresh.recipientAddresses,
        // id, time, transactionTimestamp, blockHeight, goal, goalSource preserved
      }
      if (prior.status !== fresh.status) {
        console.log(`  status: ${prior.status} → ${fresh.status}`)
        statusChanges++
      }
      campaigns.push(merged)
    } else {
      console.log(`  + new campaign`)
      campaigns.push(fresh)
      added++
    }

    if (i < ids.length - 1) await delay(500)
  }

  console.log(`\nFetched ${campaigns.length} campaigns (${added} new, ${statusChanges} status changes, ${failed} failed)`)

  fs.writeFileSync('data/fundme.json', JSON.stringify(campaigns, null, 2) + '\n')
  console.log('Saved to data/fundme.json')
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
