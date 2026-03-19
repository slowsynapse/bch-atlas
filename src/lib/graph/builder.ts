import type { Campaign, Entity, GraphNode, GraphEdge } from '@/types/campaign'
import { buildRecipientMap } from './address-analyzer'

export function buildGraph(
  campaigns: Campaign[],
  entities: Map<string, Entity>
): { nodes: GraphNode[], edges: GraphEdge[] } {
  const nodes: GraphNode[] = []
  const edges: GraphEdge[] = []
  const edgeSet = new Set<string>() // deduplicate edges

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
          continent: campaign.continent || 'other',
          url: campaign.url,
          time: campaign.time,
          transactionTimestamp: (campaign as any).transactionTimestamp,
          hasAddresses: !!campaign.recipientAddresses && campaign.recipientAddresses.length > 0
        }
      }
    })
  })

  // Add recipient nodes (kept but made tiny in visualization)
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

  // Create edges connecting campaigns to recipients (dim fund-flow strands)
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

  // --- SAME-ENTITY EDGES: direct campaign-to-campaign links ---
  // Group campaigns by entity name
  const entityCampaigns = new Map<string, string[]>()
  campaigns.forEach(campaign => {
    if (campaign.entities && campaign.entities.length > 0) {
      campaign.entities.forEach(entityName => {
        if (!entityCampaigns.has(entityName)) entityCampaigns.set(entityName, [])
        entityCampaigns.get(entityName)!.push(campaign.id)
      })
    }
  })

  // Create direct edges between campaigns sharing an entity
  entityCampaigns.forEach((campaignIds, entityName) => {
    if (campaignIds.length < 2) return
    for (let i = 0; i < campaignIds.length; i++) {
      for (let j = i + 1; j < campaignIds.length; j++) {
        const key = `entity-${campaignIds[i]}-${campaignIds[j]}`
        if (!edgeSet.has(key)) {
          edgeSet.add(key)
          edges.push({
            data: {
              id: key,
              source: campaignIds[i],
              target: campaignIds[j],
              type: 'same-entity',
              weight: 2
            }
          })
        }
      }
    }
  })

  // --- SHARED-ADDRESS EDGES: direct campaign-to-campaign links ---
  // For recipients appearing in multiple campaigns, link those campaigns directly
  allRecipients.forEach((recipient) => {
    if (recipient.campaigns.length < 2) return
    for (let i = 0; i < recipient.campaigns.length; i++) {
      for (let j = i + 1; j < recipient.campaigns.length; j++) {
        const a = recipient.campaigns[i]
        const b = recipient.campaigns[j]
        const key = `shared-${a}-${b}`
        if (!edgeSet.has(key)) {
          edgeSet.add(key)
          edges.push({
            data: {
              id: key,
              source: a,
              target: b,
              type: 'shared-address',
              weight: 1
            }
          })
        }
      }
    }
  })

  return { nodes, edges }
}
