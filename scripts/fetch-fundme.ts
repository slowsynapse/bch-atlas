import * as fs from 'fs'
import { createHash } from 'crypto'

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

type Continent = 'infrastructure' | 'wallets' | 'media' | 'charity' | 'defi' | 'commerce' | 'other'

interface Campaign {
  id: string
  platform: 'fundme'
  title: string
  description?: string
  continent?: Continent
  amount: number
  raised?: number
  status: 'success' | 'expired' | 'running' | 'unknown'
  time: string
  url: string
  entities: string[]
  recipientAddresses?: string[]
}

const KEYWORD_MAP: Record<Continent, RegExp> = {
  infrastructure: /\b(node|protocol|network|upgrade|consensus|fork|specification|chip|infrastructure|server|mining|hashrate|bchn|bchd|verde|knuth|abc|full.?node)\b/i,
  wallets: /\b(wallet|tool|library|sdk|api|extension|app|browser|mobile|electron.?cash|badger|cashual|zapit|flowee|selene)\b/i,
  media: /\b(podcast|video|tutorial|education|content|media|documentary|show|stream|article|blog|news|magazine|film|animation|music|creative)\b/i,
  charity: /\b(charity|donat|food|humanitarian|adoption|community|orphan|relief|school|health|eatbch|volunteer|aid|shelter|water)\b/i,
  defi: /\b(defi|swap|dex|contract|cashscript|cashtokens?|nft|token|fungible|smartbch|sidechain|bridge|oracle|amm)\b/i,
  commerce: /\b(merchant|shop|store|payment|pos|commerce|business|marketplace|retail|vendor|trade|exchange)\b/i,
}

function inferContinent(title: string, description?: string): Continent {
  const text = [title, (description || '').slice(0, 500)].join(' ')
  const priority: Continent[] = ['defi', 'wallets', 'infrastructure', 'media', 'charity', 'commerce']
  for (const continent of priority) {
    if (KEYWORD_MAP[continent].test(text)) return continent
  }
  return 'other'
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

function mapStatus(raw: FundMeRaw, raised: number, amount: number): Campaign['status'] {
  if (raw.isComplete) return 'success'
  // FundMe returns 'stopped' for both funded and failed campaigns.
  // If the campaign raised its goal, it's funded — not expired.
  if (raised >= amount && amount > 0) return 'success'
  const status = (raw.status || '').toLowerCase()
  if (status === 'stopped' || status === 'canceled' || status === 'cancelled' || status === 'archived') return 'expired'
  if (status === 'active' || status === 'running' || status === 'open') return 'running'
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
  const status = mapStatus(raw, raised, amount)

  const strippedDesc = raw.description ? stripHtml(raw.description) : undefined
  const campaign: Campaign = {
    id: generateId(url, title, undefined, time),
    platform: 'fundme',
    title,
    description: strippedDesc,
    continent: inferContinent(title, strippedDesc),
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
  const ids = await fetchCampaignList()

  const campaigns: Campaign[] = []
  let failed = 0

  for (let i = 0; i < ids.length; i++) {
    const id = ids[i]
    console.log(`Fetching campaign ${i + 1}/${ids.length}: ${id}`)

    const raw = await fetchCampaign(id)
    if (raw) {
      // Strip base64 image data
      delete raw.logo
      delete raw.banner
      campaigns.push(transformCampaign(raw, id))
    } else {
      failed++
    }

    // Be polite — 500ms delay between requests
    if (i < ids.length - 1) {
      await delay(500)
    }
  }

  console.log(`\nFetched ${campaigns.length} campaigns (${failed} failed)`)

  fs.writeFileSync('data/fundme.json', JSON.stringify(campaigns, null, 2))
  console.log('Saved to data/fundme.json')
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
