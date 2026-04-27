import projectsData from '../../../data/projects.json'
import type { Project, ResolvedProject, CampaignTimelineEntry } from '@/types/project'
import type { Campaign } from '@/types/campaign'

const projects: Project[] = projectsData as Project[]

export function getProjects(): Project[] {
  return projects
}

export function getProjectBySlug(slug: string): Project | undefined {
  return projects.find(p => p.slug === slug)
}

/**
 * Match campaigns to projects using campaignMatchers (text search) and campaignIds (explicit).
 * Returns fully resolved projects with campaign lists, timelines, and stats.
 */
export function getResolvedProjects(campaigns: Campaign[]): ResolvedProject[] {
  return projects.map(project => resolveProject(project, campaigns))
}

export function getResolvedProjectBySlug(slug: string, campaigns: Campaign[]): ResolvedProject | undefined {
  const project = getProjectBySlug(slug)
  if (!project) return undefined
  return resolveProject(project, campaigns)
}

/**
 * Find which project(s) a campaign belongs to.
 */
export function getProjectsForCampaign(campaignId: string, campaigns: Campaign[]): ResolvedProject[] {
  return getResolvedProjects(campaigns).filter(p => p.campaigns.includes(campaignId))
}

function resolveProject(project: Project, campaigns: Campaign[]): ResolvedProject {
  const matchedIds = new Set<string>()

  // Explicit campaign IDs
  for (const id of project.campaignIds) {
    matchedIds.add(id)
  }

  // Text matching via campaignMatchers — match against title + short description
  // Excludes URL (every flipstarter has "flipstarter" in URL → false positives)
  for (const campaign of campaigns) {
    if (matchedIds.has(campaign.id)) continue

    const text = `${campaign.title || ''} ${(campaign.description || '').slice(0, 300)}`.toLowerCase()

    for (const matcher of project.campaignMatchers) {
      if (text.includes(matcher.toLowerCase())) {
        matchedIds.add(campaign.id)
        break
      }
    }
  }

  // Build timeline from matched campaigns
  const matchedCampaigns = campaigns.filter(c => matchedIds.has(c.id))
  const sorted = matchedCampaigns.sort((a, b) => {
    const timeA = a.time ? new Date(a.time).getTime() : 0
    const timeB = b.time ? new Date(b.time).getTime() : 0
    return timeA - timeB
  })

  const timeline: CampaignTimelineEntry[] = sorted.map(c => ({
    campaignId: c.id,
    title: c.title,
    time: c.time,
    status: c.status,
    amount: c.amount,
  }))

  const successful = matchedCampaigns.filter(c => c.status === 'success')
  const totalBCH = successful.reduce((sum, c) => sum + c.amount, 0)
  const successRate = matchedCampaigns.length > 0
    ? successful.length / matchedCampaigns.length
    : 0

  return {
    ...project,
    campaigns: Array.from(matchedIds),
    totalBCH,
    successRate,
    timeline,
  }
}
