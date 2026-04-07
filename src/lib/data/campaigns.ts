import flipstartersWithAddresses from '../../../data/flipstarters-with-addresses.json'
import fundmeData from '../../../data/fundme.json'
import type { Campaign, FlipstarterRaw, Entity } from '@/types/campaign'
import { extractEntities } from '../parsers/entity-extractor'
import { buildEntityMap } from './entity-resolver'
import { mapToContinent } from './continent-mapper'
import { createHash } from 'crypto'

// Transform raw Flipstarter data to our schema
function transformFlipstarterCampaign(raw: any): Campaign {
  const campaign: Partial<Campaign> = {
    platform: 'flipstarter',
    title: raw.title,
    description: raw.description,
    category: raw.category,
    amount: raw.amount,
    status: mapStatus(raw.status),
    time: raw.time,
    url: raw.url,
    archive: raw.archive,
    announcement: raw.announcement,
    tx: raw.tx || undefined,
    // Include blockchain data if available
    recipientAddresses: raw.recipientAddresses,
    blockHeight: raw.blockHeight,
    transactionTimestamp: raw.transactionTimestamp,
  }

  const full = {
    ...campaign,
    id: generateId(campaign.url!, campaign.title!, campaign.tx, campaign.time),
    entities: extractEntities(campaign),
  } as Campaign

  full.continent = mapToContinent(full)
  return full
}

function mapStatus(status: string): Campaign['status'] {
  const lower = status.toLowerCase()
  if (lower === 'success' || lower === 'completed') return 'success'
  if (lower === 'expired' || lower === 'failed') return 'expired'
  if (lower === 'running' || lower === 'active') return 'running'
  return 'unknown'
}

function generateId(url: string, title: string, tx?: string, time?: string): string {
  // Include tx and time to handle duplicate campaigns with same URL/title
  const unique = tx || time || Date.now().toString()
  return createHash('sha256')
    .update(`${url}-${title}-${unique}`)
    .digest('hex')
    .substring(0, 16)
}

// Main data access functions
export function getCampaigns(): Campaign[] {
  const flipstarters = (flipstartersWithAddresses as any[]).map(transformFlipstarterCampaign)
  const fundme = (fundmeData as unknown as Campaign[]).map(c => ({
    ...c,
    continent: c.continent || mapToContinent(c),
  }))

  return [...flipstarters, ...fundme]
}

export function getCampaignById(id: string): Campaign | undefined {
  return getCampaigns().find(c => c.id === id)
}

export function getEntities(): Map<string, Entity> {
  const campaigns = getCampaigns()
  return buildEntityMap(campaigns)
}

export function getCampaignsByEntity(entityName: string): Campaign[] {
  const campaigns = getCampaigns()
  return campaigns.filter(c => c.entities.includes(entityName))
}

export function getStats() {
  const campaigns = getCampaigns()
  const entities = getEntities()

  const successfulCampaigns = campaigns.filter(c => c.status === 'success')

  return {
    totalCampaigns: campaigns.length,
    totalBCH: successfulCampaigns.reduce((sum, c) => sum + c.amount, 0),
    successRate: campaigns.length > 0
      ? successfulCampaigns.length / campaigns.length
      : 0,
    totalEntities: entities.size,
    avgCampaignSize: successfulCampaigns.length > 0
      ? successfulCampaigns.reduce((sum, c) => sum + c.amount, 0) / successfulCampaigns.length
      : 0,
    platformBreakdown: {
      flipstarter: campaigns.filter(c => c.platform === 'flipstarter').length,
      fundme: campaigns.filter(c => c.platform === 'fundme').length,
    }
  }
}
