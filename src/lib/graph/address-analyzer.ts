/**
 * Address Analyzer
 *
 * Analyzes recipient addresses across campaigns to identify:
 * - Multi-campaign recipients (addresses in 2+ campaigns)
 * - Total BCH received per address
 * - Success rate per address
 */

import type { Campaign } from '@/types/campaign'

export interface RecipientNode {
  address: string
  campaigns: string[]          // Campaign IDs
  totalBCH: number
  campaignCount: number
  successfulCampaigns: number
  successRate: number
  label: string                // Shortened address for display
}

/**
 * Build a map of recipient addresses to their campaign participation
 */
export function buildRecipientMap(campaigns: Campaign[]): Map<string, RecipientNode> {
  const recipientMap = new Map<string, {
    campaigns: Campaign[]
    totalBCH: number
  }>()

  // Collect all recipient addresses and their campaigns
  campaigns.forEach(campaign => {
    if (campaign.recipientAddresses) {
      campaign.recipientAddresses.forEach(address => {
        if (!recipientMap.has(address)) {
          recipientMap.set(address, {
            campaigns: [],
            totalBCH: 0
          })
        }
        const data = recipientMap.get(address)!
        data.campaigns.push(campaign)
        // Only count successful campaigns towards total
        if (campaign.status === 'success') {
          data.totalBCH += campaign.amount
        }
      })
    }
  })

  // Convert to RecipientNode format
  const nodes = new Map<string, RecipientNode>()

  recipientMap.forEach((data, address) => {
    const successfulCampaigns = data.campaigns.filter(c => c.status === 'success').length

    nodes.set(address, {
      address,
      campaigns: data.campaigns.map(c => c.id),
      totalBCH: data.totalBCH,
      campaignCount: data.campaigns.length,
      successfulCampaigns,
      successRate: data.campaigns.length > 0 ? successfulCampaigns / data.campaigns.length : 0,
      label: shortenAddress(address)
    })
  })

  return nodes
}

/**
 * Get only recipients that appear in multiple campaigns
 */
export function getMultiCampaignRecipients(
  recipientMap: Map<string, RecipientNode>
): Map<string, RecipientNode> {
  const multiCampaign = new Map<string, RecipientNode>()

  recipientMap.forEach((node, address) => {
    if (node.campaignCount >= 2) {
      multiCampaign.set(address, node)
    }
  })

  return multiCampaign
}

/**
 * Shorten BCH address for display
 * bitcoincash:qz7tywh9j0n77ed63232en9vnxq5jr40gulr5m9p0m
 * -> qz7t...9p0m
 */
function shortenAddress(address: string): string {
  // Remove 'bitcoincash:' prefix if present
  const addr = address.replace('bitcoincash:', '')

  if (addr.length <= 12) {
    return addr
  }

  return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`
}

/**
 * Get statistics about recipients
 */
export function getRecipientStats(recipientMap: Map<string, RecipientNode>) {
  const recipients = Array.from(recipientMap.values())

  return {
    totalRecipients: recipients.length,
    multiCampaignRecipients: recipients.filter(r => r.campaignCount >= 2).length,
    totalBCHReceived: recipients.reduce((sum, r) => sum + r.totalBCH, 0),
    avgCampaignsPerRecipient: recipients.length > 0
      ? recipients.reduce((sum, r) => sum + r.campaignCount, 0) / recipients.length
      : 0,
    topRecipients: recipients
      .sort((a, b) => b.totalBCH - a.totalBCH)
      .slice(0, 10)
  }
}
