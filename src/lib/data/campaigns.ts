import flipstartersWithAddresses from '../../../data/flipstarters-with-addresses.json'
import fundmeData from '../../../data/fundme.json'
import campaignOverridesData from '../../../data/campaign-overrides.json'
import type { Campaign, FlipstarterRaw, Entity } from '@/types/campaign'
import type { ResolvedProject } from '@/types/project'
import { extractEntities } from '../parsers/entity-extractor'
import { buildEntityMap } from './entity-resolver'
import { mapToContinent } from './continent-mapper'
import { getProjects, getResolvedProjects, getResolvedProjectBySlug, getProjectsForCampaign as _getProjectsForCampaign } from './project-resolver'
import { createHash } from 'crypto'

interface CampaignOverride {
  delivered?: 'yes' | 'no' | null
  projectSlug?: string | null
  note?: string | null
}

const overrides: Record<string, CampaignOverride> =
  (campaignOverridesData as { overrides?: Record<string, CampaignOverride> }).overrides || {}

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
    id: generateId(campaign.url!, campaign.title!, campaign.tx, campaign.time, campaign.amount),
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

function generateId(url: string, title: string, tx?: string, time?: string, amount?: number): string {
  // Stable, deterministic ID for a campaign. Inputs are tried in order of
  // strength: tx (unique on-chain commitment), time (set once when campaign
  // is dated), amount (last-resort disambiguator for the rare duplicate
  // url+title pair). The previous implementation used Date.now() as the
  // final fallback, which made ~80 dateless Flipstarter IDs change on
  // every server restart and broke any URL/override that referenced them.
  const unique = tx || time || (amount != null ? String(amount) : '')
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

  const all = [...flipstarters, ...fundme]

  // Phase 1: apply overrides
  const withOverrides = all.map(c => {
    const o = overrides[c.id]
    if (!o) return c
    return {
      ...c,
      delivered: o.delivered ?? c.delivered ?? null,
      overrideProjectSlug: o.projectSlug ?? c.overrideProjectSlug ?? null,
      overrideNote: o.note ?? c.overrideNote ?? null,
    }
  })

  // Phase 2: resolve project linkage. The resolver returns the project tree
  // with each project's matched campaign IDs, so we invert that into a
  // campaign → project lookup and stamp slug/name/status/continent onto
  // the campaign object.
  //
  // Continent inheritance: when a campaign belongs to a project, the
  // project's curated continent wins over the keyword-derived continent
  // from `mapToContinent()`. This keeps a project and its campaigns
  // clustered in the same atlas region instead of scattering across the
  // canvas because of fragile keyword matches in titles/descriptions.
  const projects = getResolvedProjects(withOverrides)
  const byCampaign = new Map<string, { slug: string; name: string; status: string; continent: string }>()
  for (const p of projects) {
    for (const cId of p.campaigns) {
      byCampaign.set(cId, { slug: p.slug, name: p.name, status: p.status, continent: p.continent })
    }
  }

  return withOverrides.map(c => {
    const link = byCampaign.get(c.id)
    if (!link) return { ...c, projectSlug: null, projectName: null, projectStatus: null }
    return {
      ...c,
      continent: link.continent || c.continent,
      projectSlug: link.slug,
      projectName: link.name,
      projectStatus: link.status as Campaign['projectStatus'],
    }
  })
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
  const projects = getProjects()

  const successfulCampaigns = campaigns.filter(c => c.status === 'success')

  return {
    totalCampaigns: campaigns.length,
    totalBCH: successfulCampaigns.reduce((sum, c) => sum + c.amount, 0),
    successRate: campaigns.length > 0
      ? successfulCampaigns.length / campaigns.length
      : 0,
    totalEntities: entities.size,
    totalProjects: projects.length,
    activeProjects: projects.filter(p => p.status === 'active').length,
    deadProjects: projects.filter(p => p.status === 'dead').length,
    avgCampaignSize: successfulCampaigns.length > 0
      ? successfulCampaigns.reduce((sum, c) => sum + c.amount, 0) / successfulCampaigns.length
      : 0,
    platformBreakdown: {
      flipstarter: campaigns.filter(c => c.platform === 'flipstarter').length,
      fundme: campaigns.filter(c => c.platform === 'fundme').length,
    }
  }
}

// Project-related exports
export function getProjectsData(): ResolvedProject[] {
  return getResolvedProjects(getCampaigns())
}

export function getProjectBySlug(slug: string): ResolvedProject | undefined {
  return getResolvedProjectBySlug(slug, getCampaigns())
}

export function getProjectsForCampaign(campaignId: string): ResolvedProject[] {
  return _getProjectsForCampaign(campaignId, getCampaigns())
}
