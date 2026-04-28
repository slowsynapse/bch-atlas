import type { Campaign, Entity, GraphNode, GraphEdge } from '@/types/campaign'
import { buildRecipientMap } from './address-analyzer'
import { getResolvedProjects } from '../data/project-resolver'

export function buildGraph(
  campaigns: Campaign[],
  entities: Map<string, Entity>
): { nodes: GraphNode[], edges: GraphEdge[] } {
  const nodes: GraphNode[] = []
  const edges: GraphEdge[] = []
  const edgeSet = new Set<string>()

  const allRecipients = buildRecipientMap(campaigns)
  const projects = getResolvedProjects(campaigns).filter(p => p.campaigns.length > 0)

  // Build campaign → project status lookup so we can inherit liveness on
  // funded campaigns. A funded campaign whose project is dead/dormant should
  // visually decay (red/orange planet) — the project's current state is the
  // best proxy for "did this delivery hold up".
  const campaignProjectStatus = new Map<string, { status: string; slug: string; name: string }>()
  for (const p of projects) {
    for (const cId of p.campaigns) {
      campaignProjectStatus.set(cId, { status: p.status, slug: p.slug, name: p.name })
    }
  }

  console.log(`Building graph: ${campaigns.length} campaigns, ${allRecipients.size} recipients, ${projects.length} linked projects`)

  // Campaign nodes
  campaigns.forEach(campaign => {
    const projectInfo = campaignProjectStatus.get(campaign.id)
    // Effective status drives the visual: explicit delivered:'no' override
    // beats project-status inheritance, which beats default.
    let effectiveStatus = projectInfo?.status ?? null
    if (campaign.delivered === 'no') effectiveStatus = 'dead'
    else if (campaign.delivered === 'yes') effectiveStatus = 'active'

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
          transactionTimestamp: (campaign as { transactionTimestamp?: string }).transactionTimestamp,
          hasAddresses: !!campaign.recipientAddresses && campaign.recipientAddresses.length > 0,
          projectStatus: effectiveStatus,
          projectSlug: projectInfo?.slug ?? null,
          projectName: projectInfo?.name ?? null,
          delivered: campaign.delivered ?? null,
          overrideNote: campaign.overrideNote ?? null,
        }
      }
    })
  })

  // Recipient nodes
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

  // Project nodes ("space stations") — only projects with linked campaigns
  // Small projects (1-2 campaigns) → ISS-style, Large (3+) → Starbase
  projects.forEach(project => {
    const stationSize = project.campaigns.length >= 3 ? 'large' : 'small'
    nodes.push({
      data: {
        id: `proj-${project.slug}`,
        label: project.name,
        type: 'project',
        status: project.status, // Top-level for Cytoscape selectors
        stationSize, // 'small' (ISS) | 'large' (Starbase)
        value: project.totalBCH,
        metadata: {
          slug: project.slug,
          continent: project.continent,
          status: project.status,
          github: project.github,
          website: project.website,
          x: project.x,
          telegram: project.telegram,
          reddit: project.reddit,
          campaignCount: project.campaigns.length,
          totalBCH: project.totalBCH,
          successRate: project.successRate,
          statusDetail: project.statusDetail,
          lastGithubCommit: project.lastGithubCommit,
        }
      } as any
    })
  })

  // Campaign → Recipient edges (fund flow strands)
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

  // Project → Campaign edges (project membership)
  projects.forEach(project => {
    project.campaigns.forEach(campaignId => {
      const key = `proj-${project.slug}-${campaignId}`
      if (!edgeSet.has(key)) {
        edgeSet.add(key)
        edges.push({
          data: {
            id: key,
            source: `proj-${project.slug}`,
            target: campaignId,
            type: 'project-member',
            weight: 2
          }
        })
      }
    })
  })

  // Shared-address edges between campaigns (existing on-chain entity links)
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
