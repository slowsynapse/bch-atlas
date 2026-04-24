/**
 * Campaign Data with Historical USD Pricing
 *
 * Wraps the base campaign data layer to enrich campaigns
 * with historical BCH/USD values. Server-side only.
 */

import { getCampaigns, getCampaignById } from './campaigns'
import { ensurePriceCache, getPriceForDate } from '@/lib/pricing/historical-price'
import type { Campaign } from '@/types/campaign'

/**
 * Enrich a single campaign with historical USD pricing.
 */
function enrichWithPricing(campaign: Campaign): Campaign {
  let date: Date | null = null

  if (campaign.transactionTimestamp) {
    const ts = Number(campaign.transactionTimestamp)
    if (!isNaN(ts) && ts > 0) {
      date = new Date(ts * 1000)
    }
  }

  if (!date && campaign.time) {
    const parsed = new Date(campaign.time)
    if (!isNaN(parsed.getTime())) {
      date = parsed
    }
  }

  if (!date) return campaign

  const priceData = getPriceForDate(date)
  if (!priceData) return campaign

  return {
    ...campaign,
    usdValueAtTime: Math.round(campaign.amount * priceData.price),
    priceSource: priceData.source,
    priceDate: priceData.dateKey,
  }
}

/**
 * Get all campaigns enriched with historical USD values.
 * Must be called from server-side code only.
 */
export async function getCampaignsWithPricing(): Promise<Campaign[]> {
  await ensurePriceCache()
  const campaigns = getCampaigns()
  return campaigns.map(enrichWithPricing)
}

/**
 * Get a single campaign by ID, enriched with historical USD value.
 */
export async function getCampaignByIdWithPricing(id: string): Promise<Campaign | undefined> {
  await ensurePriceCache()
  const campaign = getCampaignById(id)
  if (!campaign) return undefined
  return enrichWithPricing(campaign)
}
