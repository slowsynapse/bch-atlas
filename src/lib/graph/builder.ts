import type { Campaign, Entity, GraphNode, GraphEdge } from '@/types/campaign'
import { buildRecipientMap, getMultiCampaignRecipients } from './address-analyzer'

export function buildGraph(
  campaigns: Campaign[],
  entities: Map<string, Entity>
): { nodes: GraphNode[], edges: GraphEdge[] } {
  const nodes: GraphNode[] = []
  const edges: GraphEdge[] = []

  // Build recipient map to find all recipients
  const allRecipients = buildRecipientMap(campaigns)

  console.log(`Building graph with ${campaigns.length} campaigns and ${allRecipients.size} recipient addresses`)

  // Create campaign nodes
  campaigns.forEach(campaign => {
    nodes.push({
      data: {
        id: campaign.id,
        label: campaign.title,
        type: 'campaign',
        value: campaign.amount,
        metadata: {
          platform: campaign.platform,
          status: campaign.status,
          url: campaign.url,
          time: campaign.time,
          transactionTimestamp: (campaign as any).transactionTimestamp,
          hasAddresses: !!campaign.recipientAddresses && campaign.recipientAddresses.length > 0
        }
      }
    })
  })

  // Add recipient nodes for all addresses
  allRecipients.forEach((recipient, address) => {
    nodes.push({
      data: {
        id: `addr-${address}`,
        label: recipient.label,
        type: 'recipient',
        value: recipient.totalBCH,
        metadata: {
          address: recipient.address,
          fullAddress: address,
          campaigns: recipient.campaignCount,
          totalBCH: recipient.totalBCH,
          successRate: recipient.successRate,
          successfulCampaigns: recipient.successfulCampaigns
        }
      }
    })
  })

  // Create edges connecting campaigns to recipients (showing fund flow)
  allRecipients.forEach((recipient, address) => {
    recipient.campaigns.forEach(campaignId => {
      edges.push({
        data: {
          id: `edge-${campaignId}-${address}`,
          source: campaignId,
          target: `addr-${address}`,
          type: 'received',
          weight: 1
        }
      })
    })
  })

  return { nodes, edges }
}
